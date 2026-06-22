with open(r"c:\Users\baxti\Desktop\social-media\app\dashboard\layout.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    line_num = i + 1
    # Very simple scanner
    j = 0
    while j < len(line):
        if line[j:j+2] == '//':
            break # skip rest of line
        elif line[j:j+2] == '/*':
            # find end of block comment
            end_idx = line.find('*/', j+2)
            if end_idx != -1:
                j = end_idx + 2
                continue
            else:
                # spans multiple lines, simplified
                break
        elif line[j] == '{':
            stack.append((line_num, j, '{'))
        elif line[j] == '}':
            if stack:
                stack.pop()
            else:
                print(f"Extra closing brace at line {line_num}, col {j}")
        j += 1

print(f"Braces left in stack: {len(stack)}")
for item in stack[:20]:
    print(f"Unclosed open brace at line {item[0]}, col {item[1]}")
