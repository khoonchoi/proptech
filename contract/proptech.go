package main

import (
	"encoding/json"
	"fmt"
	"time"
	"log"
	
	"github.com/golang/protobuf/ptypes"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

// WS JSON 구조체 
type Property struct{
	PID string `json:"pid"`
	Owner string `json:"owner"`
	Price string `json:"price"`
	Params string `json:"params"`
	Winner string `json:"winner"`
	Status string `json:"status"` // registered opened finalized rejected
}


type HistoryQueryResult struct {
	Record    	*Property    `json:"record"`
	TxId     	string    		`json:"txId"`
	Timestamp 	time.Time 		`json:"timestamp"`
	IsDelete  	bool      		`json:"isDelete"`
}

func (s *SmartContract) Register(ctx contractapi.TransactionContextInterface, pid string, price string) error {

	var prop = Property{PID: pid, Price: price, Status:"registered"}
	propAsBytes, _ := json.Marshal(prop)	

	return ctx.GetStub().PutState(pid, propAsBytes)
}

func (s *SmartContract) Open(ctx contractapi.TransactionContextInterface, pid string, params string) error {
	
	// getState Property 
	propAsBytes, err := ctx.GetStub().GetState(pid)	

	if err != nil{
		return err
	} else if propAsBytes == nil{ // no State! error
		return fmt.Errorf("\"Error\":\"property not exist: "+ pid+"\"")
	}
	// state ok
	prop := Property{}
	err = json.Unmarshal(propAsBytes, &prop)
	if err != nil {
		return err
	}
	// 검증 이전상태가 registered인지
	if prop.Status != "registered" {
		return fmt.Errorf("\"Error\":\"property is not in registered condition: "+ pid+"\"")
	}
	// open 상태로 변경
	prop.Status = "opened"
	//TODO 파라미터 등록...
	

	// update to User World state
	propAsBytes, err = json.Marshal(prop);
	if err != nil {
		return fmt.Errorf("failed to Marshaling: %v", err)
	}	

	err = ctx.GetStub().PutState(pid, propAsBytes)
	if err != nil {
		return fmt.Errorf("failed to OPEN: %v", err)
	}	
	return nil
}

func (s *SmartContract) Query(ctx contractapi.TransactionContextInterface, pid string) (string, error) {

	propAsBytes, err := ctx.GetStub().GetState(pid)

	if err != nil {
		return "", fmt.Errorf("Failed to read from world state. %s", err.Error())
	}

	if propAsBytes == nil {
		return "", fmt.Errorf("%s does not exist", pid)
	}

	return string(propAsBytes[:]), nil	
}

func (s *SmartContract) History(ctx contractapi.TransactionContextInterface, pid string)([]HistoryQueryResult, error) {

	log.Printf("History: ID %v", pid)

	resultsIterator, err := ctx.GetStub().GetHistoryForKey(pid)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var prop Property
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &prop)
			if err != nil {
				return nil, err
			}
		} else {
			prop = Property{
				PID: pid,
			}
		}

		timestamp, err := ptypes.Timestamp(response.Timestamp)
		if err != nil {
			return nil, err
		}

		record := HistoryQueryResult{
			TxId:      response.TxId,
			Timestamp: timestamp,
			Record:    &prop,
			IsDelete:  response.IsDelete,
		}
		records = append(records, record)
	}

	return records, nil
}


func main() {

	chaincode, err := contractapi.NewChaincode(new(SmartContract))

	if err != nil {
		fmt.Printf("Error create teamate chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting teamate chaincode: %s", err.Error())
	}
}
