package handler

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestUploadHandler_Success(t *testing.T) {
	uploadDir := t.TempDir()
	handler := UploadHandler(uploadDir)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "test-document.pdf")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}

	testContent := []byte("test file content")
	if _, err := part.Write(testContent); err != nil {
		t.Fatalf("failed to write to form file: %v", err)
	}

	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("expected status %d, got %d", http.StatusCreated, rec.Code)
	}

	var resp UploadResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.ID == "" {
		t.Error("expected non-empty ID")
	}

	if resp.Filename != "test-document.pdf" {
		t.Errorf("expected filename 'test-document.pdf', got %q", resp.Filename)
	}

	if resp.Size != int64(len(testContent)) {
		t.Errorf("expected size %d, got %d", len(testContent), resp.Size)
	}

	if resp.Path == "" {
		t.Error("expected non-empty path")
	}

	// Verify file was actually written
	fullPath := filepath.Join(uploadDir, resp.Path)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		t.Errorf("failed to read uploaded file: %v", err)
	}

	if !bytes.Equal(content, testContent) {
		t.Errorf("file content mismatch: expected %q, got %q", testContent, content)
	}
}

func TestUploadHandler_MissingFile(t *testing.T) {
	uploadDir := t.TempDir()
	handler := UploadHandler(uploadDir)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	// Create a form field but not a file field
	if err := writer.WriteField("other", "value"); err != nil {
		t.Fatalf("failed to write form field: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}

	bodyStr := rec.Body.String()
	if !strings.Contains(bodyStr, "missing file field") {
		t.Errorf("expected error message about missing file, got: %q", bodyStr)
	}
}

func TestUploadHandler_WrongMethod(t *testing.T) {
	uploadDir := t.TempDir()
	handler := UploadHandler(uploadDir)

	req := httptest.NewRequest(http.MethodGet, "/upload", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status %d, got %d", http.StatusMethodNotAllowed, rec.Code)
	}

	bodyStr := rec.Body.String()
	if !strings.Contains(bodyStr, "method not allowed") {
		t.Errorf("expected error message about method not allowed, got: %q", bodyStr)
	}
}

func TestUploadHandler_FileTooLarge(t *testing.T) {
	uploadDir := t.TempDir()
	handler := UploadHandler(uploadDir)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "large.bin")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}

	// Write content larger than maxUploadSize (50 MB)
	largeContent := make([]byte, maxUploadSize+1024)
	if _, err := part.Write(largeContent); err != nil {
		t.Fatalf("failed to write to form file: %v", err)
	}

	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestUploadHandler_MultipleFiles(t *testing.T) {
	uploadDir := t.TempDir()
	handler := UploadHandler(uploadDir)

	// Upload first file
	body1 := &bytes.Buffer{}
	writer1 := multipart.NewWriter(body1)
	part1, err := writer1.CreateFormFile("file", "file1.txt")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	content1 := []byte("content 1")
	if _, err := part1.Write(content1); err != nil {
		t.Fatalf("failed to write: %v", err)
	}
	writer1.Close()

	req1 := httptest.NewRequest(http.MethodPost, "/upload", body1)
	req1.Header.Set("Content-Type", writer1.FormDataContentType())
	rec1 := httptest.NewRecorder()

	handler.ServeHTTP(rec1, req1)

	var resp1 UploadResponse
	if err := json.NewDecoder(rec1.Body).Decode(&resp1); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Upload second file
	body2 := &bytes.Buffer{}
	writer2 := multipart.NewWriter(body2)
	part2, err := writer2.CreateFormFile("file", "file2.txt")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	content2 := []byte("content 2")
	if _, err := part2.Write(content2); err != nil {
		t.Fatalf("failed to write: %v", err)
	}
	writer2.Close()

	req2 := httptest.NewRequest(http.MethodPost, "/upload", body2)
	req2.Header.Set("Content-Type", writer2.FormDataContentType())
	rec2 := httptest.NewRecorder()

	handler.ServeHTTP(rec2, req2)

	var resp2 UploadResponse
	if err := json.NewDecoder(rec2.Body).Decode(&resp2); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Verify both files have different IDs and paths
	if resp1.ID == resp2.ID {
		t.Error("expected different IDs for different uploads")
	}

	if resp1.Path == resp2.Path {
		t.Error("expected different paths for different uploads")
	}

	// Verify both files exist and have correct content
	fullPath1 := filepath.Join(uploadDir, resp1.Path)
	readContent1, _ := os.ReadFile(fullPath1)
	if !bytes.Equal(readContent1, content1) {
		t.Errorf("file1 content mismatch")
	}

	fullPath2 := filepath.Join(uploadDir, resp2.Path)
	readContent2, _ := os.ReadFile(fullPath2)
	if !bytes.Equal(readContent2, content2) {
		t.Errorf("file2 content mismatch")
	}
}

func TestSanitizeExt(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "simple lowercase extension",
			input: ".pdf",
			want:  ".pdf",
		},
		{
			name:  "uppercase extension",
			input: ".PNG",
			want:  ".png",
		},
		{
			name:  "double extension",
			input: ".tar.gz",
			want:  ".targz",
		},
		{
			name:  "special characters in extension",
			input: ".ex$e",
			want:  ".exe",
		},
		{
			name:  "empty extension",
			input: "",
			want:  "",
		},
		{
			name:  "dot only",
			input: ".",
			want:  "",
		},
		{
			name:  "numeric extension",
			input: ".mp3",
			want:  ".mp3",
		},
		{
			name:  "mixed alphanumeric",
			input: ".mp4",
			want:  ".mp4",
		},
		{
			name:  "extension with spaces",
			input: ".p d f",
			want:  ".pdf",
		},
		{
			name:  "extension with hyphens",
			input: ".tar-gz",
			want:  ".targz",
		},
		{
			name:  "extension with underscores",
			input: ".my_file",
			want:  ".myfile",
		},
		{
			name:  "all special characters",
			input: ".!@#$%",
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sanitizeExt(tt.input)
			if got != tt.want {
				t.Errorf("sanitizeExt(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestUploadHandler_EmptyFile(t *testing.T) {
	uploadDir := t.TempDir()
	handler := UploadHandler(uploadDir)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "empty.txt")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}

	// Write nothing to the file
	_, _ = part.Write([]byte{})

	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("expected status %d for empty file, got %d", http.StatusCreated, rec.Code)
	}

	var resp UploadResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Size != 0 {
		t.Errorf("expected size 0 for empty file, got %d", resp.Size)
	}
}

func TestUploadHandler_InvalidMultipartData(t *testing.T) {
	uploadDir := t.TempDir()
	handler := UploadHandler(uploadDir)

	req := httptest.NewRequest(http.MethodPost, "/upload", strings.NewReader("invalid data"))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=----invalid")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status %d for invalid multipart data, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestUploadHandler_FilenameWithPath(t *testing.T) {
	uploadDir := t.TempDir()
	handler := UploadHandler(uploadDir)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	// Try to upload with a path in the filename (security test)
	part, err := writer.CreateFormFile("file", "../../etc/passwd")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}

	testContent := []byte("malicious content")
	if _, err := part.Write(testContent); err != nil {
		t.Fatalf("failed to write: %v", err)
	}
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("expected status %d, got %d", http.StatusCreated, rec.Code)
	}

	var resp UploadResponse
	json.NewDecoder(rec.Body).Decode(&resp)

	// Verify the filename was sanitized using filepath.Base (should be "passwd")
	if resp.Filename != "passwd" {
		t.Errorf("expected sanitized filename 'passwd', got %q", resp.Filename)
	}

	// Verify the file was saved in the upload directory, not escaped to parent
	fullPath := filepath.Join(uploadDir, resp.Path)
	if !strings.HasPrefix(fullPath, uploadDir) {
		t.Errorf("file path escaped upload directory: %q", fullPath)
	}
}

func TestUploadHandler_ResponseContentType(t *testing.T) {
	uploadDir := t.TempDir()
	handler := UploadHandler(uploadDir)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", "test.txt")
	if _, err := part.Write([]byte("test")); err != nil {
		t.Fatalf("failed to write: %v", err)
	}
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type 'application/json', got %q", contentType)
	}
}
