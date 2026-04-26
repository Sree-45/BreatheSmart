from pathlib import Path
from typing import List

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document


def _load_html_as_text(path: Path) -> List[Document]:
    from bs4 import BeautifulSoup

    html = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    text = " ".join(soup.get_text(separator=" ").split())
    return [Document(page_content=text)]


def load_documents(directory: str) -> List[Document]:
    """Walks a directory and loads all PDF, text, markdown, and HTML files as Documents.

    Each Document is tagged with metadata.source = filename and metadata.scope = "global".
    """
    docs: List[Document] = []
    base = Path(directory)
    if not base.exists():
        return docs

    for path in sorted(base.rglob("*")):
        if path.is_dir():
            continue
        suffix = path.suffix.lower()
        loaded: List[Document] = []
        try:
            if suffix == ".pdf":
                loaded = PyPDFLoader(str(path)).load()
            elif suffix in (".txt", ".md"):
                loaded = TextLoader(str(path), encoding="utf-8").load()
            elif suffix in (".html", ".htm"):
                loaded = _load_html_as_text(path)
            else:
                continue
        except Exception as e:
            print(f"[loader] failed to load {path}: {e}")
            continue

        for d in loaded:
            d.metadata["source"] = path.name
            d.metadata["scope"] = "global"
            docs.append(d)

    return docs
