from minio import Minio
from minio.error import S3Error
import json
import psycopg2
from pathlib import Path
from io import BytesIO

logo = Path(r"C:\Users\Thiruppathi\Desktop\School\schoolos\database\prisma\seed\assets\arulneri-logo.png")
data = logo.read_bytes()

conn = psycopg2.connect("postgresql://schoolos:schoolos@localhost:5433/schoolos")
cur = conn.cursor()
cur.execute("SELECT id FROM schools WHERE slug = %s", ("arulneri",))
row = cur.fetchone()
if not row:
    raise SystemExit("arulneri school not found")
school_id = row[0]

client = Minio("localhost:9000", access_key="schoolos", secret_key="schoolos-minio", secure=False)
bucket = "schoolos"
if not client.bucket_exists(bucket):
    client.make_bucket(bucket)

# public read policy for logos
policy = {
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": ["*"]},
    "Action": ["s3:GetObject"],
    "Resource": [f"arn:aws:s3:::{bucket}/tenants/*"]
  }]
}
try:
    client.set_bucket_policy(bucket, json.dumps(policy))
except S3Error as e:
    print("policy warn", e)

object_name = f"tenants/{school_id}/logo/arulneri-logo.png"
client.put_object(bucket, object_name, BytesIO(data), length=len(data), content_type="image/png")

logo_url = f"http://10.180.96.158:9000/{bucket}/{object_name}"
cur.execute(
    "UPDATE schools SET logo_url = %s, powered_by = %s WHERE slug = %s",
    (logo_url, "Developed by SchoolOS Team", "arulneri"),
)
conn.commit()
cur.execute("SELECT slug, logo_url, powered_by, name, location, tagline FROM schools WHERE slug = %s", ("arulneri",))
print(cur.fetchone())
cur.close(); conn.close()

import urllib.request
code = urllib.request.urlopen(logo_url.replace("10.180.96.158", "127.0.0.1"), timeout=5).status
print("logo fetch", code)
print("OK", logo_url)
