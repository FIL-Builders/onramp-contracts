package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const dealEngineURL = "https://calibration.lighthouse.storage"

// Define a struct for the response
type DealStatusResponse struct {
	Proof         string `json:"proof"`
	FilecoinDeals string `json:"filecoin_deals"`
}

func sendToLighthouseDE(cid string, authToken string) error {
	log.Printf("Sending request to lighthouse Deal Engine to add CID: %s", cid)
	// Construct the URL
	url := fmt.Sprintf("https://calibration.lighthouse.storage/api/v1/deal/add_cid?cid=%s", cid)

	// Create a new HTTP request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %s", err)
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+authToken)
	req.Header.Set("Content-Type", "application/json")

	// Send the request using the HTTP client
	client := &http.Client{
		Timeout: 30 * time.Second, // Set a timeout of 30 seconds
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Check the response status
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected response status: %d %s", resp.StatusCode, http.StatusText(resp.StatusCode))
	}

	log.Println("response status: ", resp.StatusCode)
	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	// Determine response type
	contentType := resp.Header.Get("Content-Type")
	if contentType == "application/json" {
		// Parse JSON response
		var responseJSON map[string]interface{}
		if err := json.Unmarshal(body, &responseJSON); err != nil {
			return fmt.Errorf("failed to parse JSON: %w", err)
		}
		log.Println("POST Request JSON Response:", responseJSON)
	} else {
		// Handle non-JSON response
		log.Println("POST Request Non-JSON Response:", string(body))
	}

	return nil
}

// Function to check deal status
func getDealStatus(cid string, authToken string) (string, string, error) {
	log.Printf("Checking deal status and PoDSO for CID: %s", cid)

	url := fmt.Sprintf("https://calibration.lighthouse.storage/api/v1/deal/deal_status?cid=%s", cid)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+authToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("unexpected response status: %d %s", resp.StatusCode, http.StatusText(resp.StatusCode))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("failed to read response body: %w", err)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "application/json" {
		var result map[string]json.RawMessage
		err := json.Unmarshal(body, &result)
		if err != nil {
			fmt.Println("Error:", err)
			return "", "", nil
		}
		proofJSON := result["proof"]
		dealJSON := result["filecoin_deals"]

		return string(proofJSON), string(dealJSON), nil
	}
	return string(body), "", nil
}
