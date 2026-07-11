import json
from pathlib import Path

log_file = Path("C:/Users/arhaa/.gemini/antigravity-ide/brain/373d767d-0e4b-4e35-ba23-b66ebf48d49c/.system_generated/logs/transcript.jsonl")

if log_file.exists():
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                step = data.get("step_index")
                tool_calls = data.get("tool_calls", [])
                for tc in tool_calls:
                    if tc.get('name') == 'run_command':
                        cmd = tc.get('args', {}).get('CommandLine', '')
                        if 'gcloud' in cmd.lower() or 'deploy' in cmd.lower() or 'firebase' in cmd.lower():
                            print(f"Step {step}: {cmd}")
            except Exception as e:
                pass
else:
    print("Log not found")
