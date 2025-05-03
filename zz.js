/** 
* Paste one or more documents here
*/
const a= {
  "name": "AC Room 11",
  "make": "CVM C4",
  "model": "TPM30",
  "description": "",
  "enabled": true,
  "tags": [],
  "connectionSetting": {
    "connectionType": "tcp",
    "ip": "192.168.1.100",
    "port": 502,
    "slaveId": 1,
    "serialPort": "",
    "baudRate": 9600,
    "dataBits": 8,
    "stopBits": 1,
    "parity": "none",
    "_id": {
      "$oid": "6815aef7733d26887b136918"
    }
  },
  "dataPoints": [
    {
      "range": {
        "startAddress": 0,
        "count": 2,
        "fc": 3,
        "_id": {
          "$oid": "6815aef7733d26887b13691a"
        }
      },
      "parser": {
        "parameters": [
          {
            "name": "V1",
            "dataType": "FLOAT32",
            "scalingFactor": 1,
            "decimalPoint": 0,
            "byteOrder": "ABCD",
            "signed": true,
            "registerRange": "Voltage",
            "registerIndex": 0,
            "wordCount": 2,
            "_id": {
              "$oid": "6815aef7733d26887b13691c"
            }
          }
        ],
        "_id": {
          "$oid": "6815aef7733d26887b13691b"
        }
      },
      "_id": {
        "$oid": "6815aef7733d26887b136919"
      }
    }
  ],
  "createdAt": {
    "$date": "2025-05-03T05:51:51.531Z"
  },
  "updatedAt": {
    "$date": "2025-05-03T05:51:51.534Z"
  },
  "__v": 0
}