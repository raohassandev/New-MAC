{
    "name": "AC Room 1",
    "make": "CVM C4",
    "model": "TPM30",
    "description": "",
    "enabled": true,
    "tags": [],
    "connectionSetting": {
        "connectionType": "tcp",
        "tcp": {
            "ip": "192.168.1.111",
            "port": 502,
            "slaveId": 1
        }
    },
    "dataPoints": [
        {
            "range": {
                "startAddress": 0,
                "count": 1,
                "fc": 3
            },
            "parser": {
                "parameters": [
                    {
                        "name": "V1",
                        "dataType": "INT16",
                        "scalingFactor": 1,
                        "decimalPoint": 0,
                        "byteOrder": "AB",
                        "registerRange": "Voltage2",
                        "registerIndex": 0,
                        "signed": true,
                        "wordCount": 1
                    }
                ]
            }
        },
        {
            "range": {
                "startAddress": 0,
                "count": 1,
                "fc": 3
            },
            "parser": {
                "parameters": [
                    {
                        "name": "A1",
                        "dataType": "INT16",
                        "scalingFactor": 1,
                        "decimalPoint": 0,
                        "byteOrder": "AB",
                        "registerRange": "Current",
                        "registerIndex": 0,
                        "signed": true,
                        "wordCount": 1
                    }
                ]
            }
        }
    ],
    "createdBy": {
        "userId": "demo_user_id",
        "username": "Demo User",
        "email": "demo@example.com"
    }
}