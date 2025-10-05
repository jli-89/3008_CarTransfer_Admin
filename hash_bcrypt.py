# # hash_bcrypt.py
# # 生成 bcrypt 10 轮哈希；用法：python hash_bcrypt.py MySecret123

# import sys
# import bcrypt   # 依赖：pip install bcrypt

# if len(sys.argv) != 2:
#     print("Usage: python hash_bcrypt.py <plaintext-password>")
#     sys.exit(1)

# plaintext = sys.argv[1].encode("utf-8")
# hashed = bcrypt.hashpw(plaintext, bcrypt.gensalt(rounds=10))
# print(hashed.decode())       # 输出形如 $2b$10$E9...

# hash_bcrypt_interactive.py
# 用法: python hash_bcrypt_interactive.py [rounds]
# 例: python hash_bcrypt_interactive.py 12
# 若不指定 rounds，預設為 10。

# hash_bcrypt_show.py
# 用法:
#   python hash_bcrypt_show.py
# 或
#   python hash_bcrypt_show.py 12   # 指定 cost rounds 為 12

import sys
import bcrypt

def main():
    rounds = 10
    if len(sys.argv) > 1:
        try:
            rounds = int(sys.argv[1])
            if rounds < 4 or rounds > 31:
                raise ValueError()
        except ValueError:
            print("rounds 必須是介於 4 到 31 的整數")
            sys.exit(1)

    # 可見輸入（使用 input()），會在終端顯示你輸入了什麼
    pwd = input("請輸入明文密碼（會顯示）: ")
    if not pwd:
        print("密碼不可為空")
        sys.exit(1)

    # 顯示輸入（根據你的要求）
    print("你剛輸入的密碼是:", pwd)

    # 產生 bcrypt hash
    plaintext = pwd.encode("utf-8")
    hashed = bcrypt.hashpw(plaintext, bcrypt.gensalt(rounds=rounds))
    print("\nbcrypt hash:")
    print(hashed.decode())

if __name__ == "__main__":
    main()

