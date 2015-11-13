



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
        var myHTMLControl = "<canvas id='leftJoystick' width=150 height=150>Su navegador no soporta canvas :( </canvas>";
        myHTMLControl = myHTMLControl + "<canvas id=rightJoystick width=150 height=150>Su navegador no soporta canvas :( </canvas>";       

                
        document.getElementById("introrobot_watches").innerHTML= myHTMLWatches;
        document.getElementById("introrobot_control").innerHTML= myHTMLControl;
        
        //********************************************************************************************
        //********************************************************************************************
        
        
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
        cmd.angularX=0.0;
        cmd.angularY=0.0;
        window.cmd = cmd;
        
        var pose = new jderobot.Pose3DData; //pose3DData
        

        
        
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


        function rightJoystick(){

                var canvas = document.getElementById("rightJoystick");
                var ctx = canvas.getContext("2d");
                // opacidad 
                ctx.globalAlpha = 0.85;
                var cw = canvas.width;
                var ch = canvas.height;
                var X = cw / 2;
                var Y = ch / 2;
                var lineWidth = 7;
                ctx.lineWidth = lineWidth;
                var RHoop = X * 0.7; //Diametro de aro
                var RCircle = RHoop * 0.4; // Diametro del circulo
                var maxR = RHoop; // Distancia maxima a la que puede moverse
                
                var arrastrar = false;
                
                var p = {
                  'X': X,
                  'Y': Y,
                  'R': RCircle
                }; // Circle
                var delta = new Object();
                
                var normalizaX = (X + maxR) - (X - maxR); 
                var normalizaY = (Y + maxR) - (Y - maxR);
                var VX = 0;
                var VY = 0;

                function dibujarAro(x, y, r) {
                        ctx.beginPath();
                        ctx.arc(x, y, r, 0, 2 * Math.PI, true);
                        //ctx.lineWidth = 7;
                        ctx.strokeStyle = "rgb(87,125,25)";
                        ctx.stroke();
                }

                function dibujarCirculo(x, y, r) {
                        ctx.beginPath();
                        ctx.fillStyle = "rgb(75, 144, 176)";
                        ctx.arc(x, y, r, 0, 2 * Math.PI, true);
                        ctx.fill();
                }

                // dibujamos los dos compoentes del joystick
                dibujarAro(X, Y, RHoop);
                dibujarCirculo(p.X, p.Y, RCircle);
                
                // EVENTOS 
                canvas.addEventListener('mousedown', function(evt) {
                        var mousePos = oMousePos(canvas, evt);

                        if (ctx.isPointInPath(mousePos.x, mousePos.y)) {
                                arrastrar = true;
                       }
                }, false);

                // mousemove 
                canvas.addEventListener('mousemove', function(evt) {
                        var m = oMousePos(canvas, evt);
                        //ctx.beginPath();
                        //ctx.arc(X, Y, maxR, 0, 2 * Math.PI);
                        if (arrastrar) {
                                delta.x = m.x - p.X;
                                delta.y = m.y - p.Y;
                                var deltaR = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
                                var elR = Math.min(deltaR, maxR);
                                //console.log("DeltaR: " + deltaR + " elR: " + elR);
                                var angulo = Math.atan2(delta.y, delta.x);
                                //console.log(angulo); //
                                
                                x = X + elR * Math.cos(angulo);
                                y = Y + elR * Math.sin(angulo);
                                
                                rotationChange(((x - X)/maxR)); //Giro del drone
                                altitude(((y - Y)/maxR)*(-1)); //Altitud del drone
                                                                
                                ctx.clearRect(0, 0, cw, ch); // Clear and redraw the joystick
                                dibujarAro(X, Y, RHoop);
                                dibujarCirculo(x, y, RCircle);
                        }
                }, false);
                
                // mouseup 
                canvas.addEventListener('mouseup', function() {
                        
                        altitude(0); //Altitud del drone = 0
                        rotationChange(0); //Giro del drone
 
                        arrastrar = false;
                        ctx.clearRect(0, 0, cw, ch);
                        dibujarAro(X, Y, RHoop);
                        dibujarCirculo(X, Y, RCircle);
                }, false);

                // mouseout 
                canvas.addEventListener('mouseout', function() {
                        altitude(0); //Altitud del drone = 0
                        rotationChange(0); //Giro del drone
                        
                        arrastrar = false;
                        ctx.clearRect(0, 0, cw, ch);
                        dibujarAro(X, Y, RHoop);
                        dibujarCirculo(X, Y, RCircle);
                }, false);
                
                
                
                canvas.addEventListener('touchstart', function(evt) {
                        var mousePos = getTouchPos(canvas, evt);

                        if (ctx.isPointInPath(mousePos.x, mousePos.y)) {
                                arrastrar = true;
                       }
                }, false);
                
                // mousemove 
                canvas.addEventListener('touchmove', function(evt) {
                var m = getTouchPos(canvas, evt);
                //ctx.beginPath();
                //ctx.arc(X, Y, maxR, 0, 2 * Math.PI);
                if (arrastrar) {
                        delta.x = m.x - p.X;
                        delta.y = m.y - p.Y;
                        var deltaR = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
                        var elR = Math.min(deltaR, maxR);
                        //console.log("DeltaR: " + deltaR + " elR: " + elR);
                        var angulo = Math.atan2(delta.y, delta.x);
                        //console.log(angulo); //
                        
                        x = X + elR * Math.cos(angulo);
                        y = Y + elR * Math.sin(angulo);
                        
                        
                        rotationChange(((x - X)/maxR)); //Giro del drone
                        altitude(((y - Y)/maxR)*(-1)); //Altitud del drone

                        
                        ctx.clearRect(0, 0, cw, ch);
                        dibujarAro(X, Y, RHoop);
                        dibujarCirculo(x, y, RCircle);
                }

                }, false);
                
                // mouseup 
                canvas.addEventListener('touchend', function() {
                        rotationChange(0); //Giro del drone
                        altitude(0); //Altitud del drone
                          
                        arrastrar = false;
                        ctx.clearRect(0, 0, cw, ch);
                        dibujarAro(X, Y, RHoop);
                        dibujarCirculo(X, Y, RCircle);
                }, false);
                
                // mouseout 
                canvas.addEventListener('touchup', function() {
                        rotationChange(0); //Giro del drone
                        altitude(0); //Altitud del drone
                        
                        arrastrar = false;
                        ctx.clearRect(0, 0, cw, ch);
                        dibujarAro(X, Y, RHoop);
                        dibujarCirculo(X, Y, RCircle);
                }, false);

                
                // Prevent scrolling when touching the canvas
                document.body.addEventListener("touchstart", function (e) {
                        if (e.target == canvas) {
                                e.preventDefault();
                        }
                }, false);
                
                document.body.addEventListener("touchend", function (e) {
                        if (e.target == canvas) {
                                e.preventDefault();
                        }
                }, false);
                
                document.body.addEventListener("touchmove", function (e) {
                        if (e.target == canvas) {
                                e.preventDefault();
                        }
                }, false);
}
        


        function leftJoystick(){

                var canvas = document.getElementById("leftJoystick");
                var ctx = canvas.getContext("2d");
                // opacidad 
                ctx.globalAlpha = 0.85;
                var cw = canvas.width;
                var ch = canvas.height;
                var X = cw / 2;
                var Y = ch / 2;
                var lineWidth = 7;
                ctx.lineWidth = lineWidth;
                var RHoop = X * 0.7; //Diametro de aro
                var RCircle = RHoop * 0.4; // Diametro del circulo
                var maxR = RHoop; // Distancia maxima a la que puede moverse
                
                var arrastrar = false;
                
                var p = {
                  'X': X,
                  'Y': Y,
                  'R': RCircle
                }; // Circle
                var delta = new Object();
                
                var normalizaX = (X + maxR) - (X - maxR); 
                var normalizaY = (Y + maxR) - (Y - maxR);
                var VX = 0;
                var VY = 0;

                function dibujarAro(x, y, r) {
                        ctx.beginPath();
                        ctx.arc(x, y, r, 0, 2 * Math.PI, true);
                        //ctx.lineWidth = 7;
                        ctx.strokeStyle = "rgb(87,125,25)";
                        ctx.stroke();
                }

                function dibujarCirculo(x, y, r) {
                        ctx.beginPath();
                        ctx.fillStyle = "rgb(255, 144, 76)";
                        ctx.arc(x, y, r, 0, 2 * Math.PI, true);
                        ctx.fill();
                }

                // dibujamos los dos compoentes del joystick
                dibujarAro(X, Y, RHoop);
                dibujarCirculo(p.X, p.Y, RCircle);
                
                // EVENTOS 
                canvas.addEventListener('mousedown', function(evt) {
                        var mousePos = oMousePos(canvas, evt);

                        if (ctx.isPointInPath(mousePos.x, mousePos.y)) {
                                arrastrar = true;
                       }
                }, false);

                // mousemove 
                canvas.addEventListener('mousemove', function(evt) {
                        var m = oMousePos(canvas, evt);
                        //ctx.beginPath();
                        //ctx.arc(X, Y, maxR, 0, 2 * Math.PI);
                        if (arrastrar) {
                                delta.x = m.x - p.X;
                                delta.y = m.y - p.Y;
                                var deltaR = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
                                var elR = Math.min(deltaR, maxR);
                                //console.log("DeltaR: " + deltaR + " elR: " + elR);
                                var angulo = Math.atan2(delta.y, delta.x);
                                //console.log(angulo); //
                                
                                x = X + elR * Math.cos(angulo);
                                y = Y + elR * Math.sin(angulo);
                                
                                
                                VY = ((x - X)/maxR); // establecemos las velocidades (VY y VX van al reves ya que consuderamos x (avance) el joystick hacia adelante)
                                VX = ((y - Y)/maxR)*(-1);
                                
                                setXYValues(VX,-VY);// Change variables and send the command to the drone
                                //console.log("VX: " + VY);

                                
                                ctx.clearRect(0, 0, cw, ch); // Clear and redraw the joystick
                                dibujarAro(X, Y, RHoop);
                                dibujarCirculo(x, y, RCircle);
                        }
                }, false);
                
                // mouseup 
                canvas.addEventListener('mouseup', function() {
                        VX = 0;
                        VY = 0;
                        setXYValues(VX,-VY);// Change variables and send the command to the drone

                          
                        arrastrar = false;
                        ctx.clearRect(0, 0, cw, ch);
                        dibujarAro(X, Y, RHoop);
                        dibujarCirculo(X, Y, RCircle);
                }, false);

                // mouseout 
                canvas.addEventListener('mouseout', function() {
                        VX = 0;
                        VY = 0;
                        setXYValues(VX,-VY);// Change variables and send the command to the drone

                        
                        arrastrar = false;
                        ctx.clearRect(0, 0, cw, ch);
                        dibujarAro(X, Y, RHoop);
                        dibujarCirculo(X, Y, RCircle);
                }, false);
                
                
                
                canvas.addEventListener('touchstart', function(evt) {
                        var mousePos = getTouchPos(canvas, evt);

                        if (ctx.isPointInPath(mousePos.x, mousePos.y)) {
                                arrastrar = true;
                       }
                }, false);
                
                // mousemove 
                canvas.addEventListener('touchmove', function(evt) {
                var m = getTouchPos(canvas, evt);
                //ctx.beginPath();
                //ctx.arc(X, Y, maxR, 0, 2 * Math.PI);
                if (arrastrar) {
                        delta.x = m.x - p.X;
                        delta.y = m.y - p.Y;
                        var deltaR = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
                        var elR = Math.min(deltaR, maxR);
                        //console.log("DeltaR: " + deltaR + " elR: " + elR);
                        var angulo = Math.atan2(delta.y, delta.x);
                        //console.log(angulo); //
                        
                        x = X + elR * Math.cos(angulo);
                        y = Y + elR * Math.sin(angulo);
                        
                        
                        VY = ((x - X)/maxR); // establecemos las velocidades (VY y VX van al reves ya que consuderamos x (avance) el joystick hacia adelante)
                        VX = ((y - Y)/maxR)*(-1);
                        
                        setXYValues(VX,-VY);// Change variables and send the command to the drone

                        
                        ctx.clearRect(0, 0, cw, ch);
                        dibujarAro(X, Y, RHoop);
                        dibujarCirculo(x, y, RCircle);
                }

                }, false);
                
                // mouseup 
                canvas.addEventListener('touchend', function() {
                        VX = 0;
                        VY = 0;
                        setXYValues(VX,-VY);// Change variables and send the command to the drone

                          
                        arrastrar = false;
                        ctx.clearRect(0, 0, cw, ch);
                        dibujarAro(X, Y, RHoop);
                        dibujarCirculo(X, Y, RCircle);
                }, false);
                
                // mouseout 
                canvas.addEventListener('touchup', function() {
                        VX = 0;
                        VY = 0;
                        setXYValues(VX,-VY);// Change variables and send the command to the drone

                        
                        arrastrar = false;
                        ctx.clearRect(0, 0, cw, ch);
                        dibujarAro(X, Y, RHoop);
                        dibujarCirculo(X, Y, RCircle);
                }, false);

                
                // Prevent scrolling when touching the canvas
                document.body.addEventListener("touchstart", function (e) {
                        if (e.target == canvas) {
                                e.preventDefault();
                        }
                }, false);
                
                document.body.addEventListener("touchend", function (e) {
                        if (e.target == canvas) {
                                e.preventDefault();
                        }
                }, false);
                
                document.body.addEventListener("touchmove", function (e) {
                        if (e.target == canvas) {
                                e.preventDefault();
                        }
                }, false);
}
              
        // Funciones Posicion del raton
        function oMousePos(canvas, evt) {
                // Detecta la posición del raton en un canvas
                var ClientRect = canvas.getBoundingClientRect();
                return { //objeto
                        x: Math.round(evt.clientX - ClientRect.left),
                        y: Math.round(evt.clientY - ClientRect.top)
                }
        }

        // Posicion si tocamos la pantalla
        function getTouchPos(canvasDom, touchEvent) {
                var rect = canvasDom.getBoundingClientRect();
                return {
                        x: touchEvent.touches[0].clientX - rect.left,
                        y: touchEvent.touches[0].clientY - rect.top
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
        //****************************************************************************************************************

        
        function altitude(val) {
            setVZ(val);
            sendVelocities();
         }
         
        this.start = function(){
                startConnection().then(
                        function(ar){
                                console.log(ar);
                                PanelControl = new panelControl();
                                leftJoystick();
                                rightJoystick();
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
                //console.log(roll);
                PanelControl.updatePanelControl(yaw, pitch, roll, pose);
        }
}    