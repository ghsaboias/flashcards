import csv
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple


@dataclass
class Occurrence:
    set_name: str
    file_path: str
    row_number: int
    question: str
    answer: str


def split_answer_parts(answer: str) -> List[str]:
    """Split answers by ';' or ' or ' and normalize case/whitespace.

    Example: 'to be; to exist or be there' -> ['to be', 'to exist', 'be there']
    """
    if not answer:
        return []
    parts = re.split(r";|\s+or\s+", answer)
    normalized = [p.strip().lower() for p in parts if p and p.strip()]
    return normalized


def infer_set_name_from_path(file_path: Path) -> str:
    """Derive the logical set name from a CSV file path by stripping the suffix.

    Example: Recognition_Practice/HSK_Level_1/HSK1_Set_01_flashcards.csv
             -> Recognition_Practice/HSK_Level_1/HSK1_Set_01
    """
    stem = file_path.stem
    # Remove trailing "_flashcards" from stem if present
    if stem.endswith("_flashcards"):
        stem = stem[: -len("_flashcards")]
    # Rebuild with parent directories
    return str(file_path.with_name(stem)).replace("\\", "/")


def scan_csvs(base_dir: Path) -> Tuple[Dict[str, List[Occurrence]], Dict[str, List[Occurrence]]]:
    """Scan all *_flashcards.csv files under base_dir and collect occurrences.

    Returns:
        (by_question, by_answer_part)
    """
    by_question: Dict[str, List[Occurrence]] = defaultdict(list)
    by_answer_part: Dict[str, List[Occurrence]] = defaultdict(list)

    files = sorted(base_dir.glob("*_flashcards.csv"))
    for file_path in files:
        set_name = infer_set_name_from_path(file_path)
        try:
            with file_path.open("r", newline="", encoding="utf-8") as f:
                reader = csv.reader(f)
                for idx, row in enumerate(reader, start=1):
                    if len(row) < 2:
                        continue
                    question = (row[0] or "").strip()
                    answer = (row[1] or "").strip()
                    if not question and not answer:
                        continue

                    occ = Occurrence(
                        set_name=set_name,
                        file_path=str(file_path),
                        row_number=idx,
                        question=question,
                        answer=answer,
                    )

                    if question:
                        by_question[question].append(occ)

                    for part in split_answer_parts(answer):
                        by_answer_part[part].append(occ)
        except Exception as e:
            print(f"Warning: Failed to read {file_path}: {e}")

    return by_question, by_answer_part


def print_duplicates(title: str, mapping: Dict[str, List[Occurrence]], limit: int = 0) -> None:
    duplicates = [(key, occs) for key, occs in mapping.items() if len(occs) > 1]
    # Sort by number of occurrences (desc), then key
    duplicates.sort(key=lambda x: (-len(x[1]), x[0]))

    total = len(duplicates)
    print(f"\n=== {title} (total groups: {total}) ===")
    shown = 0
    for key, occs in duplicates:
        sets = sorted({o.set_name for o in occs})
        across_sets = len(sets) > 1
        print(f"- '{key}' -> {len(occs)} occurrences{' across sets' if across_sets else ''}")
        for o in occs:
            print(f"    • {o.set_name} @ {o.file_path}:{o.row_number} | Q:'{o.question}' | A:'{o.answer}'")
        shown += 1
        if limit and shown >= limit:
            print(f"... ({total - shown} more groups omitted)\n")
            break


def main():
    # Default: scan HSK Level 1
    base = Path("Recognition_Practice/HSK_Level_1")
    if len(sys.argv) > 1:
        # Allow passing a custom directory
        base = Path(sys.argv[1])

    if not base.exists():
        print(f"Base directory not found: {base}")
        sys.exit(1)

    print(f"Scanning CSVs under: {base}")
    by_question, by_answer_part = scan_csvs(base)

    print_duplicates("Duplicate QUESTIONS (symbols)", by_question)
    print_duplicates("Duplicate ANSWER PARTS", by_answer_part)


if __name__ == "__main__":
    main()


