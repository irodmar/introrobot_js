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

// Variables de control
var NavdataProxy;
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



function quatToYaw(qw,qx,qy,qz) {                     
        var rotateZa0=2.0*(qx*qy + qw*qz);
        var rotateZa1=qw*qw + qx*qx - qy*qy - qz*qz;
        var rotateZ=0.0;
        if(rotateZa0 != 0.0 && rotateZa1 != 0.0){
            rotateZ=Math.atan2(rotateZa0,rotateZa1);
        }
        return rotateZ*180/Math.PI ;
}

function quatToRoll(qw,qx,qy,qz){
        rotateXa0=2.0*(qy*qz + qw*qx);
        rotateXa1=qw*qw - qx*qx - qy*qy + qz*qz;
        rotateX=0.0;
        
        if(rotateXa0 != 0.0 && rotateXa1 !=0.0){
            rotateX=Math.atan2(rotateXa0, rotateXa1)
        }   
        return rotateX*180/Math.PI;
}
function quatToPitch(qw,qx,qy,qz){
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

function Canvas(){
    canvas = document.getElementById("canvas");
    
    if (canvas.getContext) {
      var context = canvas.getContext('2d');
      // Size of the cnvas to draw circle in the middle the axis position
      canvasX = context.canvas.width;
      canvasY = context.canvas.height;
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
            setVY(x/(canvasX/2));
            setVX(y/(canvasY/2));
            sendVelocities();
            circleX = e.pageX - this.offsetLeft;
            circleY = e.pageY - this.offsetTop;
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.beginPath();
            context.fillStyle = "rgb(255, 0, 0)";
            context.arc(circleX, circleY, radious, 0, 2 * Math.PI, true);
            context.fill();
       }
    };
    }

// 
// extraProxy

var baseextra = communicator.stringToProxy("Extra:ws -h localhost -p 17000");
jderobot.ArDroneExtraPrx.checkedCast(baseextra).then(
    function(ar){
        extraProxy = ar;
        console.log("extraProxy connected: " + ar);
    },
    function(ex, ar){
        console.log("extraProxy NOT connected: " + ex)
    }
);


// extraProxy functions  
function takeoff () {
    extraProxy.takeoff().then(
    function(ar){
        console.log("Take Off.");
    },
    function(ex, ar){
        console.log("Take Off failed.")
    }
);
}
    
function land () {
    extraProxy.land().then(
    function(ar){
        console.log("Landing.");
    },
    function(ex, ar){
        console.log("Landing failed: " + ex)
    }
);
}

function toggleCam(){
    extraProxy.toggleCam().then(
    function(ar){
        console.log("toggleCam.");
    },
    function(ex, ar){
        console.log("toggleCam failed: " + ex)
    }
);
}

function reset() {
    extraProxy.reset().then(
    function(ar){
        console.log("Reset.");
    },
    function(ex, ar){
        console.log("Reset failed: " + ex)
    }
);
}



// NavData
var basenavdata = communicator.stringToProxy("Navdata:ws -h localhost -p 15000");
jderobot.NavdataPrx.checkedCast(basenavdata).then(
    function(ar){
        console.log("navdataProxy connected: " + ar);
        navdataProxy = ar;
        navdataProxy.getNavdata().then(
        function(navdata){
            showNavdata(navdata);
            window.navdata=navdata;
            if (navdata.vehicle == ARDRONE_SIMULATED) {
                virtualDrone = true;
                console.log("virtualDrone = true")
            } else {
                virtualDrone = false;
                console.log("virtualDrone = false")
            }
        },
        function (ex, ar){
            console.log("Fail getNavdata() function: " + ex)
        }
        );
    },
    function (ex, ar){
        console.log("navdataProxy NOT connected: " + ex)
    }        
);


function updateNavData() {
    navdataProxy.getNavdata().then(
        function(ar){
            navdata = ar;
            window.navdata=ar;
            showNavdata(ar);
        },
        function (ex, ar){
            console.log("Fail getNavdata() function." + ex)
        }        
    );    
}


function showNavdata(data) {
    document.getElementById("rotX").innerText = "rotX: "+ data.rotX;
    document.getElementById("altd").innerText = "altd: " +data.altd;

}



// CMDVelPrx
var basecmdVel = communicator.stringToProxy("CMDVel:ws -h localhost -p 11000");
jderobot.CMDVelPrx.checkedCast(basecmdVel).then(
    function(VelProxy){
        console.log("cmdVelProxy connected: " + VelProxy);
        cmdVelProxy = VelProxy;
    },
    function(ex, ar){
        console.log("cmdVelProxy NOT connected: " + ex)
    }
);

function velocities () {
    window.cmdV=cmdVelProxy;
    cmdVelProxy.setCMDVelData(cmd).then(
    function(ar){
        console.log("Velocities.");
    },
    function(ex, ar){
        console.log("Velocities failed.")
    }
);
}

function sendVelocities () {
    window.cmdV=cmdVelProxy;
    cmdVelProxy.setCMDVelData(cmd).then(
    function(ar){
        //console.log("sendVelocities.");
    },
    function(ex, ar){
        console.log("sendVelocities failed.")
    }
);
}

function sendCMDVel(vx,vy,vz,yaw,roll,pitch){
    cmd.linearX=vy
    cmd.linearY=vx
    cmd.linearZ=vz
    cmd.angularZ=yaw
    cmd.angularX=cmd.angularY=1.0
    sendVelocities();
}


// Pose3D
var basepose3D = communicator.stringToProxy("ImuPlugin:ws -h localhost -p 19000");
jderobot.Pose3DPrx.checkedCast(basepose3D).then(
    function(ar){
        console.log("pose3DProxy connected: " + ar);
        pose3DProxy = ar;
        pose3DProxy.getPose3DData().then(
            function (ar2){
                pose = ar2;
            },
            function(ex, ar2){
                console.log("Fail call getPoseDData().");
            });
    },
    function(ex, ar){
        console.log("pose3DProxy NOT connected: " + ex)
    }
);

    
function updatePose(){
    pose3DProxy.getPose3DData().then(
            function (ar2){
                pose=ar2;
                window.pose3D = ar2;
                //console.log("getPose3DData. ")
            },
            function(ex, ar2){
                console.log("Fail call getPoseDData().");
            });   
}

function setPose3D(){    
    pose3DProxy.setPose3DData(pose).then(
            function (ar2){
                console.log("setPose3DData.");
            },
            function(ex, ar2){
                console.log("Fail setPose3DData function.");
            });   
}


function startTimeOuts(){
    var tmpnavData = setTimeout(updateNavData(), 3000);
}


function update() {
    updateNavData();
    updatePose();
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


var fader = document.getElementById("fader");

// enviamos cuando se mueve el fader
function Fader(value) {
	document.querySelector('#val').value = value;
    setVZ(value);
    sendVelocities();
 }
     
      