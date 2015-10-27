



var introrobot_js = function(ip, baseextraPort, navdataProxyPort, cmdVelProxyPort, pose3DProxyPort){
        
        
        
        //********************************************************************************************
        // Add necesary HTML to the page
        //********************************************************************************************

        var myHTMLWatches =  "<span id=airspeed></span>";
        myHTMLWatches = myHTMLWatches + "<span id=attitude></span>";
        myHTMLWatches = myHTMLWatches + "<span id=altimeter></span>";
        myHTMLWatches = myHTMLWatches + "<span id=turn_coordinator></span>";
        myHTMLWatches = myHTMLWatches + "<span id=heading></span>";
        myHTMLWatches = myHTMLWatches + "<span id=variometer></span>";
        var myHTMLControl = "<canvas id=canvas width=220 height=140 style=\"border:1px solid black\">Your browser does not support the HTML5 canvas tag.</canvas>";
        myHTMLControl = myHTMLControl + "<input id = knob class=knob data-width=85 data-min=-1 data-max=1 data-angleOffset=-125 data-angleArc=250 data-step = 0.01 data-cursor=true data-fgColor=#222222 data-thickness=.2 value=0>";
        myHTMLControl = myHTMLControl + "<label for=fader align=center> Fader </laber>";
        myHTMLControl = myHTMLControl + "<input id = altura type=range min=-1 max=1 value=0 id=fader orient=vertical class=vertical step= 0.05 enabled>";
        myHTMLControl = myHTMLControl + "<output for=fader id=AltVal> 0 </output>";        

                
        document.getElementById("introrobot_watches").innerHTML= myHTMLWatches;
        document.getElementById("introrobot_control").innerHTML= myHTMLControl;
        
        //********************************************************************************************
        //********************************************************************************************
        
        // Event for the altitude fader
        document.getElementById('altura').oninput = function() {
                altitude();
        }
        
        // Variables generales
        var ARDRONE1 = 0;
        var ARDRONE2 = 1;
        var ARDRONE_SIMULATED = 10;
        var virtualDrone = true;
        
        
        // Variable ICE para la conexion
        var id = new Ice.InitializationData();
        id.properties = Ice.createProperties();
        //id.properties.setProperty("Ice.Trace.Network", "3"); // Propiedad para tracear la conexion
        //sid.properties.setProperty("Ice.Trace.Protocol", "1"); // Propiedad para tracear la conexion
        var communicator = Ice.initialize(id);
        
        // Variables de control del Drone
        var navdataProxy;
        var extraProxy;
        var cmdVelProxy;
        var pose3DProxy;

        //********************************************************************************************
        //********************************************************************************************
        // Variable datos del drone
        var navdata = new jderobot.NavdataData; //nvdata
        var cmd = new jderobot.CMDVelData; //cmdVelData
        cmd.linearX=0.0;
        cmd.linearY=0.0;
        cmd.linearZ=0.0;
        cmd.angularZ=0.0;
        cmd.angularX=0.5;
        cmd.angularY=1.0;
        window.cmd = cmd;
        
        var pose = new jderobot.Pose3DData; //pose3DData
        
        //*********************************************************************************************
        //*********************************************************************************************
        // Variables del canvas del manejo del vuelo
        var canvas;
        // Dimensions of the canvas
        var canvasX;
        var canvasY;
        // var defines send data or not
        var mouseIsDown = false;
        var moveCircle = false;
        // radious of the circle
        var radious = 7;
        //pos the center of the circle
        var circleX;
        var circleY;
        
        
        // Varibale del panel de control de los intrumentos
        var PanelControl;
        var intervalo = null;


        
        // ICE Connect
        function startConnection(){
                return new Promise(function(resolve, reject) {
                        // base extra connection
                        var baseextra = communicator.stringToProxy("Extra:ws -h " + ip + " -p " + baseextraPort);
                        jderobot.ArDroneExtraPrx.checkedCast(baseextra).then(
                            function(ar){
                                extraProxy = ar;
                                console.log("extraProxy connected: " + ar);
                            },
                            function(ex, ar){
                                console.log("extraProxy NOT connected: " + ex);
                            }
                        );               
                        
                        
                        // NavData
                        var basenavdata = communicator.stringToProxy("Navdata:ws -h " + ip + " -p " + navdataProxyPort);
                        jderobot.NavdataPrx.checkedCast(basenavdata).then(
                            function(ar){
                                console.log("navdataProxy connected: " + ar);
                                navdataProxy = ar;
                                navdataProxy.getNavdata().then(
                                function(navdata){
                                    if (navdata.vehicle == ARDRONE_SIMULATED) {
                                        virtualDrone = true;
                                        console.log("virtualDrone = true");
                                    } else {
                                        virtualDrone = false;
                                        console.log("virtualDrone = false");
                                    }
                                },
                                function (ex, ar){
                                    console.log("Fail getNavdata() function: " + ex);
                                }
                                );
                            },
                            function (ex, ar){
                                console.log("navdataProxy NOT connected: " + ex);
                            }        
                        );        
                      
                        // CMDVelPrx
                        var basecmdVel = communicator.stringToProxy("CMDVel:ws -h " + ip + " -p " + cmdVelProxyPort);
                        jderobot.CMDVelPrx.checkedCast(basecmdVel).then(
                            function(ar){
                                console.log("cmdVelProxy connected: " + ar);
                                cmdVelProxy = ar;
                            },
                            function(ex, ar){
                                console.log("cmdVelProxy NOT connected: " + ex);
                            }
                        );             
                      
                        // Pose3D
                       var basepose3D = communicator.stringToProxy("ImuPlugin:ws -h " + ip + " -p " + pose3DProxyPort);
                       jderobot.Pose3DPrx.checkedCast(basepose3D).then(
                           function(ar){
                               console.log("pose3DProxy connected: " + ar);
                               pose3DProxy = ar;
                                window.po = pose3DProxy;
                                resolve("Stuff worked!");
                               pose3DProxy.getPose3DData().then(
                                   function (ar){
                                       console.log("getPoseDData().");
                                       pose = ar;
                                   },
                                   function(ex, ar){
                                       console.log("Fail call getPoseDData().");
                                   });
                           },
                           function(ex, ar){
                               console.log("pose3DProxy NOT connected: " + ex)
                           }
                       );
                    });
                }
        
        
        // Canvas        
        function startCanvas(){
                
            canvas = document.getElementById("canvas");
            
            if (canvas.getContext) {
                var context = canvas.getContext('2d');
                context.clearRect(0, 0, canvas.width, canvas.height); // Borramos por si acaso llamamos a la funcion al llamamos a la funcion con la funcion stop
                // Size of the cnvas to draw circle in the middle the axis position
                canvasX = context.canvas.width;
                canvasY = context.canvas.height;
                setVY(0); // Change variables and send the command to the drone
                setVX(0);
                sendVelocities();
                circleX = canvasX/2;
                circleY = canvasY/2;
                // Draw a circle in the center of the canvas
                context.beginPath();
                context.fillStyle = "rgb(255, 0, 0)";
                context.arc(circleX, circleY, radious, 0, 2 * Math.PI, true);
                context.fill();
            }
            
            // Add event listener for `click` events.
            canvas.onmousedown = function(e) {
                mouseIsDown = true;
                var x = e.pageX - this.offsetLeft;
                var y = e.pageY - this.offsetTop;
                if ((circleX - (radious/2)) < x && x < (circleX + (radious/2)) && (circleY - (radious/2)) < y && y < (circleY + (radious/2))) {
                    moveCircle = true;
                }
            }
            // When release the click stop sending data
            canvas.onmouseup = function(e){
                mouseIsDown = false;
                moveCircle = false;
            }
        
            // Get the mouse position
            canvas.onmousemove = function (e) {
                if (mouseIsDown && moveCircle){
                    var x = e.pageX - this.offsetLeft - (canvasX/2);
                    var y = (e.pageY - this.offsetTop - (canvasY/2))*(-1);
                    setVY(x/(canvasX/2)); // Change variables and send the command to the drone
                    setVX(y/(canvasY/2));
                    sendVelocities();
                    circleX = e.pageX - this.offsetLeft; // eliminamos el circulo y dibujamos otro con las nuevas coordenadas
                    circleY = e.pageY - this.offsetTop;
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.beginPath();
                    context.fillStyle = "rgb(255, 0, 0)";
                    context.arc(circleX, circleY, radious, 0, 2 * Math.PI, true);
                    context.fill();
               }
            };
            }
                       
        
        
        // Functions return the value of fliying parameters
        function getYaw(qw,qx,qy,qz) {                     
                var rotateZa0=2.0*(qx*qy + qw*qz);
                var rotateZa1=qw*qw + qx*qx - qy*qy - qz*qz;
                var rotateZ=0.0;
                if(rotateZa0 != 0.0 && rotateZa1 != 0.0){
                    rotateZ=Math.atan2(rotateZa0,rotateZa1);
                }
                return rotateZ*180/Math.PI ;
        }
        
        function getRoll(qw,qx,qy,qz){
                rotateXa0=2.0*(qy*qz + qw*qx);
                rotateXa1=qw*qw - qx*qx - qy*qy + qz*qz;
                rotateX=0.0;
                
                if(rotateXa0 != 0.0 && rotateXa1 !=0.0){
                    rotateX=Math.atan2(rotateXa0, rotateXa1)
                }   
                return rotateX*180/Math.PI;
        }
        function getPitch(qw,qx,qy,qz){
                rotateYa0=-2.0*(qx*qz - qw*qy);
                rotateY=0.0;
                if(rotateYa0>=1.0){
                    rotateY=math.PI/2.0;
                } else if(rotateYa0<=-1.0){
                    rotateY=-Math.PI/2.0
                } else {
                    rotateY=Math.asin(rotateYa0)
                }
                
                return rotateY*180/Math.PI;
        }
        //*********************************************************************************************
        //*********************************************************************************************
        
       
        
        // extraProxy functions  
        this.takeoff = function () {
            extraProxy.takeoff().then(
                function(ar){
                    console.log("Take Off.");
                },
                function(ex, ar){
                    console.log("Take Off failed.")
                }
                );
        }
            
        this.land = function() {
                extraProxy.land().then(
                function(ar){
                    console.log("Landing.");
                },
                function(ex, ar){
                    console.log("Landing failed: " + ex)
                }
                );
        }
        
        this.toogleCam = function(){
                extraProxy.toggleCam().then(
                function(ar){
                    console.log("toggleCam.");
                },
                function(ex, ar){
                    console.log("toggleCam failed: " + ex)
                }
            );
        }
        
        this.stop = function(){
                startCanvas(); // ReWrite the canvas
                document.getElementById('altura').value = 0; // Set altitude to 0   
                document.querySelector('#AltVal').value = 0; // set altitude indicator to 0
                setVZ(0); // Altitude velocity to 0 and send to the drone
                sendVelocities();
                rotationChange(0); //change e rotation to 0
                document.getElementById('knob').value = 0; // Ratotaion value set to 0
                $('.knob')  // set 0 canvas jquery button
                        .val(0)
                        .trigger('change');
                console.log("Stop");
        }
        
        
        
        function updateNavData() {
            navdataProxy.getNavdata().then(
                function(ar){
                    navdata = ar;
                    //console.log("updateNavData()");
                },
                function (ex, ar){
                    console.log("Fail getNavdata() function." + ex)
                }        
            );    
        }
        
        
        function sendVelocities () {
            cmdVelProxy.setCMDVelData(cmd).then(
            function(ar){
                //console.log("sendVelocities.");
            },
            function(ex, ar){
                console.log("sendVelocities failed.")
            }
        );
        }
        
        this.sendCMDVel = function(vx,vy,vz,yaw,roll,pitch){
            cmd.linearX=vy
            cmd.linearY=vx
            cmd.linearZ=vz
            cmd.angularZ=yaw
            cmd.angularX=cmd.angularY=1.0
            sendVelocities();
        }
        
        

        
            
        function updatePose(){
            pose3DProxy.getPose3DData().then(
                    function (ar){
                        pose=ar;
                        //console.log("getPose3DData. ")
                    },
                    function(ex, ar){
                        console.log("Fail call getPoseDData(): " + ar2);
                    });   
        }
        
        function setPose3D (){    
            pose3DProxy.setPose3DData(pose).then(
                    function (ar){
                        console.log("setPose3DData.");
                    },
                    function(ex, ar){
                        console.log("Fail setPose3DData function: " + ar);
                    });   
        }

        function setXYValues(newX,newY){
                setVY(newY);
                setVX(newX);
                sendVelocities();
        }

        function rotationChange (newYaw){
                setYaw(newYaw);
                sendVelocities();
        }
        

        function setVX(vx){
                cmd.linearX=vx;
        }
        function setVY(vy){
                cmd.linearY=vy;
        } 
        function setVZ(vz){
                cmd.linearZ=vz;
        }
        function setYaw(yaw){
                cmd.angularZ=yaw;
        }
        function setRoll(roll){
                cmd.angularX=roll; 
        }
        function setPitch(pitch){
                cmd.angularY=pitch;
        }
        
        //****************************************************************************************************************
        // Rotation button
        //****************************************************************************************************************

        
        $(function($) {

			$(".knob").knob({
				change : function (value) {
					rotationChange(value);
					//console.log("change : " + value);
				},
				draw : function () {
					// "tron" case
					if(this.$.data('skin') == 'tron') {

						this.cursorExt = 0.3;

						var a = this.arc(this.cv)  // Arc
							, pa                   // Previous arc
							, r = 1;

						this.g.lineWidth = this.lineWidth;

						if (this.o.displayPrevious) {
							pa = this.arc(this.v);
							this.g.beginPath();
							this.g.strokeStyle = this.pColor;
							this.g.arc(this.xy, this.xy, this.radius - this.lineWidth, pa.s, pa.e, pa.d);
							this.g.stroke();
						}

						this.g.beginPath();
						this.g.strokeStyle = r ? this.o.fgColor : this.fgColor ;
						this.g.arc(this.xy, this.xy, this.radius - this.lineWidth, a.s, a.e, a.d);
						this.g.stroke();

						this.g.lineWidth = 2;
						this.g.beginPath();
						this.g.strokeStyle = this.o.fgColor;
						this.g.arc( this.xy, this.xy, this.radius - this.lineWidth + 1 + this.lineWidth * 2 / 3, 0, 2 * Math.PI, false);
						this.g.stroke();

						return false;
					}
				}
			});			
		});
        
        
        //****************************************************************************************************************
        //****************************************************************************************************************

        
        function altitude() {
            var val =  document.getElementById('altura').value;    
            document.querySelector('#AltVal').value = val;
            setVZ(val);
            sendVelocities();
         }
         
        this.start = function(){
                startConnection().then(
                        function(ar){
                                console.log(ar);
                                startCanvas();
                                PanelControl = new panelControl();
                                intervalo = setInterval(updateAndShow, 20);
                        },
                        function(ex, ar){
                                console.log(ex+ar);
                        }
                );
                   
        }
        
        
        function updateAndShow(){
                updatePose();
                updateNavData();
                // calculate yaw, pitch, and roll
                var yaw = getYaw(pose.q0, pose.q1, pose.q2, pose.q3);
                var pitch = getPitch(pose.q0, pose.q1, pose.q2, pose.q3);
                var roll = getRoll(pose.q0, pose.q1, pose.q2, pose.q3);                
                PanelControl.updatePanelControl(yaw, pitch, roll, pose);
        }
}    