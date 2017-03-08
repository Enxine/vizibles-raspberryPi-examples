// (c) Copyright 2017 Enxine DEV S.C.
// Released under Apache License, version 2.0
// @author: jamartinez@enxine.com
//
// It works as a "who-is-in" or presence detector
// It search for nearby devices using both interfaces: ethernet and bluetooth.
// Ethernet searches are based in ARP requests.
//
// See details about how to configure environment an run the example here:
//   https://developers.vizibles.com/en/devices/raspberry/
//

// devDependency (only for debugging)
//var logtimestamp = require('log-timestamp');

var debug = false;
var LOG = debug ? console.log.bind(console) : function () {};

var fs = require('fs');
var browser = require('iotdb-arp');
var vizibles = require('vizibles');

var connected = false;
var scanInterval = null;

// If set to true only previously know devices are considered. In other case
// all devices found are updated in the platform.
var ONLY_KNOWN_DEVICES = true;

// Frequency of searching loop execution
var SEARCH_FREQ = 20000;

var FAILED_SEARCHES_TO_REMOVE = 6;

var knownDevices = {
    /*
      This object defines a list with your known devices. Each property name
      is the MAC address of a device, and its value is an object containing
      the name that you can give to that device in the platform. For example:

      '00-00-00-00-00-01': {'name': 'DEVICE01-NAME'},
      '00-00-00-00-00-02': {'name': 'DEVICE02-NAME'}
    */
};

var bluFoundDevices = [];
var bluCurrentDevices = [];

// list of 'normalized' (':' changed for '-') MACs 
var ethFoundDevices = [];
var ethCurrentDevices = [];

var ethNotFoundDevices = {};

function clearAllConnectionStatus() {
    bluFoundDevices.splice(0);
    bluCurrentDevices.splice(0);
    ethFoundDevices.splice(0);
    ethCurrentDevices.splice(0);
    ethNotFoundDevices = {};
    
    var prop = {};
    for (var property in knownDevices) {
	if (knownDevices.hasOwnProperty(property) && knownDevices[property].name) {
	    prop[knownDevices[property].name] = 0;
	}
    }
    LOG('Update: ' + JSON.stringify(prop));
    vizibles.update(prop);
}

function updateDeviceStatus(mac, status) {
    var deviceName = mac;
    var isKnown = false;
    if ((knownDevices[mac]) && (knownDevices[mac].name)) {
	isKnown = true;
	deviceName = knownDevices[mac].name;
    }
    var prop = {};
    prop[deviceName] = status;

    if (isKnown || !ONLY_KNOWN_DEVICES) {
	LOG('Update: ' + JSON.stringify(prop));
	vizibles.update(prop);
    }
}

function scanEth() {
    ethFoundDevices.splice(0);
    browser.browser({}, function(error, packet) {
	if (error) {
	    LOG('Error: ');
	    LOG(error);
	    return;
	}
	else if (packet) {
	    var normMac = packet.mac.replace(/\W/g, '-');
	    LOG('Found MAC: ' + normMac);
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

function onConnected() {
    LOG('Connected to Vizibles!');
    if (!connected) {
        connected = true;

	clearAllConnectionStatus();

	var bluetoothSerialPort = null;
	try {
	    bluetoothSerialPort = require('bluetooth-serial-port');
	}
	catch (e) {}
	if (bluetoothSerialPort) {
	    var btSerial = new (bluetoothSerialPort).BluetoothSerialPort();
	    btSerial.on('found', function(address, name) {
		LOG('Found BLU: ' + address);
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
		bluFoundDevices = bluFoundDevices.filter(function(device) { return device.foundLastSearch });
		var newDevices = bluFoundDevices.filter(function(device) { return (device.counter >= 1) });
		for (i = 0; i < newDevices.length; i++) {
		    if (!bluCurrentDevices.find(checkAddress, newDevices[i].address)) {
			bluCurrentDevices.push(newDevices[i]);
			updateDeviceStatus(newDevices[i].address.replace(/\W/g, '-'), 1);
		    }
		}
		bluFoundDevices = bluFoundDevices.filter(function(device) { return (device.counter < 1) });

		for (i = 0; i < bluCurrentDevices.length; i++) {
		    if (bluCurrentDevices[i].foundLastSearch) {
			bluCurrentDevices[i].delCounter = 0; 
		    } else {
			bluCurrentDevices[i].delCounter++;
			if (bluCurrentDevices[i].delCounter >= FAILED_SEARCHES_TO_REMOVE) {
			    updateDeviceStatus(bluCurrentDevices[i].address.replace(/\W/g, '-'), 0);
			}
		    }
		}
		bluCurrentDevices = bluCurrentDevices.filter(function(device) { return (device.delCounter < FAILED_SEARCHES_TO_REMOVE) });
	    });
	}
	
	scanInterval = setInterval(function() {
	    LOG('\n\nSearching....');

	    // restart count for devices found
	    ethFoundDevices.forEach(function(item) {
		if (ethNotFoundDevices.hasOwnProperty(item)) {
		    delete ethNotFoundDevices[item];
		}
	    });
	    
	    // remove devices not found in last 20 searches
	    var notFoundDevices = ethCurrentDevices.filter(function(device) { return ethFoundDevices.indexOf(device) == -1 });
	    notFoundDevices.forEach(function(item) {
		if (ethNotFoundDevices.hasOwnProperty(item)) {
		    ethNotFoundDevices[item]++;
		    if (ethNotFoundDevices[item] == 20) {
			ethCurrentDevices.splice(ethCurrentDevices.indexOf(item), 1);
			updateDeviceStatus(item, 0);
			delete ethNotFoundDevices[item];
		    }
		} else {
		    ethNotFoundDevices[item] = 0;
		}
	    });
	    
	    scanEth();

	    // set flags to false before starting search
	    for (i = 0; i < bluFoundDevices.length; i++) {
		bluFoundDevices[i].foundLastSearch = false;
	    }
	    for (i = 0; i < bluCurrentDevices.length; i++) {
		bluCurrentDevices[i].foundLastSearch = false;
	    }
	    
	    if (bluetoothSerialPort) btSerial.inquire();
	    
        }, SEARCH_FREQ);      

    }
}

function onDisconnected(err) {
    LOG('Disconnected from Vizibles with error: ' + JSON.stringify(err));
    clearInterval(scanInterval);
    connected = false;
}

vizibles.connect({
    id: 'eth-blu-scanner',
    // TODO: replace the <TODO> strings with values obtained from Vizibles and
    // then uncomment next line
    //credentials: {keyId: '<TODO>', secret: '<TODO>'}, 
    onConnected: onConnected, 
    onDisconnected: onDisconnected
});
