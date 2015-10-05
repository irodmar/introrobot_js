function panel(){
    
    // Dynamic examples
    var attitude = $.flightIndicator('#attitude', 'attitude', {roll:50, pitch:-20, size:200, showBox : true}); // Horizon
    var heading = $.flightIndicator('#heading', 'heading', {heading:150, showBox:true}); // Compass
    //var variometer = $.flightIndicator('#variometer', 'variometer', {vario:-5, showBox:true}); // vertical speed
    //var airspeed = $.flightIndicator('#airspeed', 'airspeed', {showBox: false}); // air speed
    var altimeter = $.flightIndicator('#altimeter', 'altimeter');
    var turn_coordinator = $.flightIndicator('#turn_coordinator', 'turn_coordinator', {turn:0}); // alas avion
    
    // Update at 20Hz
    setInterval(function() {
        // Airspeed update
        updatePose();
        var yaw = quatToYaw(pose.q0, pose.q1, pose.q2, pose.q3);
        var pitch = quatToPitch(pose.q0, pose.q1, pose.q2, pose.q3);
        var roll = quatToRoll(pose.q0, pose.q1, pose.q2, pose.q3);

        //airspeed.setAirSpeed(80+80*Math.sin(increment/10));
    
        // Attitude update
        attitude.setRoll(roll);
        attitude.setPitch(pitch);

        // Altimeter update
        altimeter.setAltitude(pose.z*100);
        //altimeter.setPressure(1000+3*Math.sin(increment/50));
    
        // TC update
        turn_coordinator.setTurn(roll);
    
        // Heading update
        heading.setHeading(yaw);
    
        // Vario update
        //variometer.setVario(2*Math.sin(increment/10));

    
}, 50);  }