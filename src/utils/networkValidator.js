const { isIP } = require('net');

const validateNetwork = (networkName, ipAddress) => {
  const OFFICE_NETWORK_NAME = process.env.OFFICE_NETWORK_NAME;
  const OFFICE_IP_RANGE = process.env.OFFICE_IP_RANGE;

  // Validate IP address
  if (!isIP(ipAddress)) {
    return false;
  }

  // Convert IP range to start and end IPs
  const [rangeIP, mask] = OFFICE_IP_RANGE.split('/');
  const ipLong = ip2long(ipAddress);
  const rangeLong = ip2long(rangeIP);
  const maskLong = -1 << (32 - parseInt(mask));
  
  return (ipLong & maskLong) === (rangeLong & maskLong);
};

// Helper function to convert IP to long
function ip2long(ip) {
  const parts = ip.split('.');
  let long = 0;
  
  for (let i = 0; i < parts.length; i++) {
    long += parseInt(parts[i]) * Math.pow(256, 3 - i);
  }
  
  return long;
}

module.exports = {
  validateNetwork,
};
