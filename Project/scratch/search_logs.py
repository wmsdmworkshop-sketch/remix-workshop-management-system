import json
from pathlib import Path

log_file = Path("C:/Users/arhaa/.gemini/antigravity-ide/brain/373d767d-0e4b-4e35-ba23-b66ebf48d49c/.system_generated/logs/transcript.jsonl")

if log_file.exists():
    print("Found transcript log. Parsing...")
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                step = data.get("step_index")
                content = str(data.get("content", ""))
                tool_calls = data.get("tool_calls", [])
                
                # Check inside content and tool calls
                if "deploy" in content.lower() or "gcloud" in content.lower():
                    print(f"\n[Step {step}] Content match:")
                    print(content[:300] + "...")
                
                for tc in tool_calls:
                    args_str = str(tc.get("args", tc.get("Arguments", "")))
                    if "deploy" in args_str.lower() or "gcloud" in args_str.lower() or "run" in args_str.lower():
                        print(f"\n[Step {step}] Tool call: {tc.get('name', tc.get('ToolName'))}")
                        print("Args:", args_str)
            except Exception as e:
                pass
else:
    print("Transcript log not found.")
