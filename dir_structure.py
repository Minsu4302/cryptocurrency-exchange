import os

def print_directory_structure(root_path, indent='', level=1, max_level=3):
    if level > max_level:
        return

    entries = sorted(os.listdir(root_path))
    for index, entry in enumerate(entries):
        path = os.path.join(root_path, entry)
        is_last = index == len(entries) - 1
        connector = '└── ' if is_last else '├── '

        print(indent + connector + entry + ('/' if os.path.isdir(path) else ''))

        if os.path.isdir(path):
            new_indent = indent + ('    ' if is_last else '│   ')
            print_directory_structure(path, new_indent, level + 1, max_level)

if __name__ == "__main__":
    root_dir = "."  # 현재 경로
    print("📁 프로젝트 디렉토리 구조 (최대 3단계)\n")
    print_directory_structure(root_dir)
