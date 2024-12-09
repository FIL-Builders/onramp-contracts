package main

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/filecoin-project/go-data-segment/merkletree"
	"github.com/ipfs/go-cid"
)

const dealEngineURL = "https://calibration.lighthouse.storage"

// Define a struct for the response
type ProofData struct {
	CID        string `json:"cid"`
	PieceCID   string `json:"piece_cid"`
	FileProofs []struct {
		InclusionProof struct {
			ProofIndex struct {
				Index string   `json:"index"`
				Path  []string `json:"path"`
			} `json:"proofIndex"`
			ProofSubtree struct {
				Index string   `json:"index"`
				Path  []string `json:"path"`
			} `json:"proofSubtree"`
		} `json:"inclusionProof"`
		IndexRecord struct {
			ProofIndex   string `json:"proofIndex"`
			ProofSubtree int    `json:"proofSubtree"`
			Size         int    `json:"size"`
			Checksum     string `json:"checksum"`
		} `json:"indexRecord"`
		VerifierData struct {
			CommPc string `json:"commPc"`
			SizePc string `json:"sizePc"`
		} `json:"verifierData"`
	} `json:"file_proofs"`
	LastUpdate int64 `json:"last_update"`
}

type FilecoinDeal struct {
	DealUUID           string `json:"dealUUID"`
	AggregateIn        string `json:"aggregateIn"`
	StorageProvider    string `json:"storageProvider"`
	StartEpoch         int    `json:"startEpoch"`
	EndEpoch           int    `json:"endEpoch"`
	ProviderCollateral string `json:"providerCollateral"`
	PublishCID         string `json:"publishCID"`
	ChainDealID        int    `json:"chainDealID"`
	DealStatus         string `json:"dealStatus"`
	PrevDealID         int    `json:"prevDealID"`
	LastUpdate         int64  `json:"lastUpdate"`
}

type ResponseData struct {
	Proof         ProofData      `json:"proof"`
	FilecoinDeals []FilecoinDeal `json:"filecoin_deals"`
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
func getDealStatus(cid string, authToken string) (*ResponseData, error) {
	log.Printf("Checking deal status and PoDSI for CID: %s", cid)

	url := fmt.Sprintf("https://calibration.lighthouse.storage/api/v1/deal/deal_status?cid=%s", cid)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+authToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected response status: %d %s", resp.StatusCode, http.StatusText(resp.StatusCode))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "application/json" {
		var response ResponseData
		err := json.Unmarshal([]byte(body), &response)
		if err != nil {
			log.Fatalf("Failed to parse JSON: %v", err)
		}

		var result map[string]json.RawMessage
		err = json.Unmarshal(body, &result)
		if err != nil {
			fmt.Println("Error:", err)
			return nil, nil
		}

		return &response, nil
	}
	return nil, nil
}

func ExtractProofDetail(proof ProofData) (cid.Cid, merkletree.ProofData, error) {
	// Extract piece_cid and proofSubtree
	commP, err := cid.Decode(proof.PieceCID)
	if err != nil {
		log.Fatalln("failed to parse cid %w", err)
	}

	var proofSubtree merkletree.ProofData
	if len(proof.FileProofs) > 0 {
		var proofSubtreeRaw = proof.FileProofs[0].InclusionProof.ProofSubtree
		indexNum, err := strconv.ParseUint(proofSubtreeRaw.Index, 10, 64)
		if err != nil {
			fmt.Println("Error:", err)
		}
		proofSubtree.Index = indexNum

		path := make([]merkletree.Node, len(proofSubtreeRaw.Path))
		for i, hash := range proofSubtreeRaw.Path {
			if len(hash) != 32*2 { // Check if the hash has the correct length (64 characters for 32 bytes)
				return cid.Cid{}, merkletree.ProofData{}, fmt.Errorf("invalid hash length at index %d", i)
			}
			nodeBytes, err := hex.DecodeString(hash)
			if err != nil {
				return cid.Cid{}, merkletree.ProofData{}, fmt.Errorf("failed to decode hash at index %d: %w", i, err)
			}
			copy(path[i][:], nodeBytes) // Copy the bytes into the Node array
		}

		proofSubtree.Path = path
	}

	return commP, proofSubtree, nil
}

// func main() {
// 	cid := "bafkreidl6jh2cdnv6lvlhccsn2viliafq63lvoti7k7zyenaprtegwkiie"
// 	authToken := "u8t8gf6ds06re"

// 	// Call the GET request function
// 	responseJSON, err := getDealStatus(cid, authToken)
// 	if err != nil {
// 		log.Fatalf("Error in GET request: %v", err)
// 	}

// 	// Log or process the JSON response
// 	log.Printf("Response JSON: %s", responseJSON.Proof.FileProofs[0].InclusionProof.ProofSubtree)

// 	pieceCID, proofSubtree, err := ExtractProofDetail(responseJSON.Proof)
// 	if err != nil {
// 		fmt.Println("Error:", err)
// 		return
// 	}

// 	// Print the extracted values
// 	fmt.Println("Piece CID:", pieceCID)
// 	fmt.Println("Proof Subtree:", proofSubtree)

// 	log.Println("Process completed successfully.")
// }
