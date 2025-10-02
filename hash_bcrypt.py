# hash_bcrypt.py
# 生成 bcrypt 10 轮哈希；用法：python hash_bcrypt.py MySecret123

import sys
import bcrypt   # 依赖：pip install bcrypt

if len(sys.argv) != 2:
    print("Usage: python hash_bcrypt.py <plaintext-password>")
    sys.exit(1)

plaintext = sys.argv[1].encode("utf-8")
hashed = bcrypt.hashpw(plaintext, bcrypt.gensalt(rounds=10))
print(hashed.decode())       # 输出形如 $2b$10$E9...
