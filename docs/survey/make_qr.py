"""EASWA 설문/앱 QR 생성기.
사용법:
  python make_qr.py "<URL>" [출력파일명.png] ["라벨"]
예:
  python make_qr.py "https://forms.gle/XXXX" qr_form.png "설문 응답"
  python make_qr.py "https://easwa-webapp.onrender.com/" qr_easwa_webapp.png "EASWA 웹앱"
필요: pip install qrcode pillow
"""
import sys
import qrcode
from qrcode.constants import ERROR_CORRECT_M


def make(url: str, path: str, label: str = "") -> None:
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_M, box_size=12, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(path)
    print(f"saved {path} -> {url}" + (f" ({label})" if label else ""))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    url = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else "qr.png"
    label = sys.argv[3] if len(sys.argv) > 3 else ""
    make(url, out, label)
