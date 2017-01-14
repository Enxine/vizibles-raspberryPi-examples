var fs = require('fs');
var browser = require('iotdb-arp');
var vizibles = require('vizibles-nodejs-library');
var cloudConnectionOpened = false;
var scanInterval = null;

var knownDevices = {
};

var bluFoundDevices = [];
var bluCurrentDevices = [];
var ethFoundDevices = [];
var ethCurrentDevices = [];

function updateDeviceStatus(mac, status) {
    var deviceName = mac;
    if ((knownDevices[mac]) && (knownDevices[mac].name)) deviceName = knownDevices[mac].name;
    var prop = {};
    prop[deviceName] = status;
    console.log('Update: ' + JSON.stringify(prop));
    vizibles.update(prop);
}

function scanEth() {
    ethFoundDevices.splice(0);
    browser.browser({}, function(error, packet) {
	if (error) return;
	else if (packet) {
	    //console.log('arp found: ' + packet);
	    var normMac = packet.mac.replace(/\W/g, '-');
	    console.log('Found MAC: ' + normMac);
	    if (ethFoundDevices.indexOf(normMac) == -1) ethFoundDevices.push(normMac);
	    if (ethCurrentDevices.indexOf(normMac) == -1) {
		ethCurrentDevices.push(normMac);
		updateDeviceStatus(normMac, 1);
	    }
	}
    });
}

function checkAddress(device) {
    if (device.address == this) return true;
    return false;
}

function checkFoundLastSearch(device) {
    if (device.foundLastSearch) return true;
    return false;
}

function checkFound1Times(device) {
    if (device.counter >= 1) return true;
    return false;
}

function checkFoundPending(device) {
    if (device.counter < 1) return true;
    return false;
}

function checkDelCounterNotReached(device) {
    if (device.delCounter < 3) return true;
    return false;
}

function onConnected() {
    console.log('Connected to Vizibles!');
    if (!cloudConnectionOpened) {
        cloudConnectionOpened = true;

	var btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();

	btSerial.on('found', function(address, name) {
	    //console.log('Found: ' + address + ', ' + name);
	    console.log('Found BLU: ' + address);
	    var foundDevice = bluFoundDevices.find(checkAddress, address);
	    if (foundDevice) {
		foundDevice.foundLastSearch = true;
		foundDevice.counter++;
	    } else {
		var newDevice = {};
		newDevice.address = address;
		newDevice.name = name;
		newDevice.foundLastSearch = true;
		newDevice.counter = 1;
		newDevice.delCounter = 0;
		bluFoundDevices.push(newDevice);
	    }

	    var currentDevice = bluCurrentDevices.find(checkAddress, address);
	    if (currentDevice) {
		currentDevice.foundLastSearch = true;
	    }
	    
	});
	
	btSerial.on('finished', function() {
	    //console.log('Finished');
	    bluFoundDevices = bluFoundDevices.filter(checkFoundLastSearch);
	    var newDevices = bluFoundDevices.filter(checkFound1Times);
	    //console.log('found: ' + JSON.stringify(bluFoundDevices));
	    //console.log('new: ' + JSON.stringify(newDevices));
	    for (i = 0; i < newDevices.length; i++) {
		if (!bluCurrentDevices.find(checkAddress, newDevices[i].address)) {
		    bluCurrentDevices.push(newDevices[i]);
		    updateDeviceStatus(newDevices[i].address.replace(/\W/g, '-'), 1);
		}
	    }
	    bluFoundDevices = bluFoundDevices.filter(checkFoundPending);

	    for (i = 0; i < bluCurrentDevices.length; i++) {
		if (bluCurrentDevices[i].foundLastSearch) {
		    bluCurrentDevices[i].delCounter = 0; 
		} else {
		    bluCurrentDevices[i].delCounter++;
		    if (bluCurrentDevices[i].delCounter >= 3) {
			updateDeviceStatus(bluCurrentDevices[i].address.replace(/\W/g, '-'), 0);
		    }
		}
	    }
	    bluCurrentDevices = bluCurrentDevices.filter(checkDelCounterNotReached);
	});

	
	scanInterval = setInterval(function() {
	    console.log('\n\nSearching....');
	    
	    // remove devices not found in last search
	    var notFoundDevices = ethCurrentDevices.filter(function(device) { return ethFoundDevices.indexOf(device) == -1});
	    notFoundDevices.forEach(function(item) {
		updateDeviceStatus(item, 0);
	    });
	    ethCurrentDevices = ethCurrentDevices.filter(function(device) { return ethFoundDevices.indexOf(device) != -1});
	    
	    scanEth();

	    // set flags to false before starting search
	    for (i = 0; i < bluFoundDevices.length; i++) {
		bluFoundDevices[i].foundLastSearch = false;
	    }
	    for (i = 0; i < bluCurrentDevices.length; i++) {
		bluCurrentDevices[i].foundLastSearch = false;
	    }
	    //console.log('initial found: ' + JSON.stringify(bluFoundDevices));
	    btSerial.inquire();
        }, 15000);      

    }
}

function onDisconnected(err) {
    console.log('Disconnected from Vizibles with error: ' + JSON.stringify(err));
    clearInterval(scanInterval);
    cloudConnectionOpened = false;
}

vizibles.connect({
    id: 'eth-blu-scanner',
    credentials: {keyId: '<TO_BE_COMPLETED>', secret: '<TO_BE_COMPLETED>'},
    onConnected: onConnected, 
    onDisconnected: onDisconnected});
