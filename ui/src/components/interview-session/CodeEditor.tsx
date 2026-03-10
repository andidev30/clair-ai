import { Box } from '@mui/material';
import Editor, { type OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  starterCode: string;
  value: string;
  onChange: (value: string) => void;
  onLargePaste?: (lineCount: number) => void;
}

export default function CodeEditor({
  language,
  starterCode,
  value,
  onChange,
  onLargePaste,
}: CodeEditorProps) {
  const handleMount: OnMount = (editor) => {
    editor.onDidPaste((e) => {
      const lines = e.range.endLineNumber - e.range.startLineNumber;
      if (lines >= 5) onLargePaste?.(lines);
    });
  };
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Editor
          language={language || 'javascript'}
          value={value || starterCode}
          onChange={(v) => onChange(v ?? '')}
          onMount={handleMount}
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
