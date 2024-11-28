#!/bin/bash
set -o pipefail
set -eu

# Check if the file path to offer is passed as an argument
if [ $# -ne 3 ]; then
    echo "Usage: $0 <file_path> <payment-addr> <payment-amount>"
    exit 1
fi

# Check if the 'car' command is available
if ! command -v car &> /dev/null; then
    echo "Error: car command not found"
    exit 1
fi

# Check if the 'stream-commp' command is available
if ! command -v stream-commp &> /dev/null; then
    echo "Error: stream-commp command not found"
    exit 1
fi


export CAR_FILE_PATH="$1.car"

# Check if the .car file exists and delete it
if [ -f "$CAR_FILE_PATH" ]; then
    rm "$CAR_FILE_PATH"
fi

car create --output $CAR_FILE_PATH --version 1 $1
export HASH_OUT=$(cat $CAR_FILE_PATH | stream-commp 2>&1)

# Data Plane
export BUFFER_ID=$(curl --silent -X POST -T $CAR_FILE_PATH "http://localhost:5077/put" | jq '.id')
export BUFFER_ADDR="http://localhost:5077/get?id=$BUFFER_ID"

# Control Plane
export COMMP=$(echo "$HASH_OUT" | sed -nE 's/CommPCid: (.*)/\1/p')
export SIZE=$(echo "$HASH_OUT" | sed -nE 's/Padded piece: *([0-9]+) bytes/\1/p')
echo "> xchain/xchain client offer $COMMP $SIZE $BUFFER_ADDR $2 $3 "
xchain/xchain client offer $COMMP $SIZE "$BUFFER_ADDR" $2 $3 