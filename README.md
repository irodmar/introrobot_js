# UAV_viewer_js

UAV_viejer_js is a WebApp that allows you to connect with the Gazebo simulator and pilot a Drone remotely from a web browser.

You can clone the entire code and use/change it.

##Use it in your WebApp 
 
All you need to port it to your web page and use it is:

###Add code
####HTML:
<pre>
<head>
	<link rel="stylesheet" type="text/css" href="css/flightindicators.css">
	
	<script src="js/jquery-2.1.4.min.js"></script>
	<script src="js/jquery.flightindicators.js"></script>
	
	<script type="text/javascript" src="droneSensors.js"></script>
	
	<script type="text/javascript" src="js/zeroc-icejs-master/lib/Ice.js"></script>
	<script type="text/javascript" src="js/zeroc-icejs-master/lib/Glacier2.js"></script>
	<script type="text/javascript" src="js/zeroc-icejs-master/lib/IceStorm.js"></script>
	<script type="text/javascript" src="js/jderobot/cmdvel.js"></script>
	<script type="text/javascript" src="js/jderobot/ardroneextra.js"></script>
	<script type="text/javascript" src="js/jderobot/navdata.js"></script>
	<script type="text/javascript" src="js/jderobot/pose3d.js"></script>
	<script type="text/javascript" src="introtobot_JS.js"></script>
	
	<script src="js/knob/jquery.knob.min.js"></script>
</head>


<body>
	<section id = UAV_watches></section>
	<section id = UAV_control></section>
</body>
</pre>
 
####JavaScript:
<pre>
var UAV = new uavViewer_js (Drone_IP, baseextraPort,navdataProxyPort, cmdVelProxyPort, pose3DProxyPort);
</pre>

###Public methods
Start: is the first method you have to call. It starts the communication and set up the environment in the browser.
<pre>
UAV.start();
</pre>

Take Off:
<pre>
UAV.takeoff();
</pre>

Land: 
<pre>
UAV.land();
</pre>

Stop: Makes the drone stop and establish all the movement orders.
<pre>
UAV.stop();
</pre>
