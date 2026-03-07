import { Box, Typography } from '@mui/material';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  problem: string;
  language: string;
  starterCode: string;
  value: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({
  problem,
  language,
  starterCode,
  value,
  onChange,
}: CodeEditorProps) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {problem && (
        <Box
          sx={{
            p: 2,
            bgcolor: 'grey.50',
            borderBottom: 1,
            borderColor: 'divider',
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Coding Challenge
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {problem}
          </Typography>
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Editor
          language={language || 'javascript'}
          value={value || starterCode}
          onChange={(v) => onChange(v ?? '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </Box>
    </Box>
  );
}
