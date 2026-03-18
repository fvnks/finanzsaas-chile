"--- Git Status ---" | Out-File -FilePath git_info.txt -Encoding utf8
git status | Out-File -FilePath git_info.txt -Append -Encoding utf8
"--- Git Branch ---" | Out-File -FilePath git_info.txt -Append -Encoding utf8
git branch -a | Out-File -FilePath git_info.txt -Append -Encoding utf8
"--- Git Log ---" | Out-File -FilePath git_info.txt -Append -Encoding utf8
git log -n 10 --oneline --decorate | Out-File -FilePath git_info.txt -Append -Encoding utf8
"--- Git Remote ---" | Out-File -FilePath git_info.txt -Append -Encoding utf8
git remote -v | Out-File -FilePath git_info.txt -Append -Encoding utf8
