#!/usr/bin/env python3
import csv
import glob
from pathlib import Path


def load_official_hsk1_words() -> set[str]:
    """Return the official HSK1 set of 150 words (Simplified)."""
    words = [
        "爱", "八", "爸爸", "杯子", "北京", "本", "不客气", "不", "菜", "茶", "吃", "出租车", "打电话", "大", "的", "点", "电脑", "电视", "电影", "东西", "都", "读", "对不起", "多", "多少", "儿子", "二", "饭店", "飞机", "分钟", "高兴", "个", "工作", "狗", "汉语", "好", "号", "喝", "和", "很", "后面", "回", "会", "几", "家", "叫", "今天", "九", "开", "看", "看见", "块", "来", "老师", "了", "冷", "里", "六", "吗", "妈妈", "买", "猫", "没关系", "没有", "米饭", "名字", "明天", "哪", "哪儿", "那", "呢", "能", "你", "年", "女儿", "朋友", "漂亮", "苹果", "七", "前面", "钱", "请", "去", "热", "人", "认识", "三", "商店", "上", "上午", "少", "谁", "什么", "十", "时候", "是", "书", "水", "水果", "睡觉", "说", "四", "岁", "他", "她", "太", "天气", "听", "同学", "喂", "我", "我们", "五", "喜欢", "下", "下午", "下雨", "先生", "现在", "想", "小", "小姐", "些", "写", "谢谢", "星期", "学生", "学习", "学校", "一", "一点儿", "医生", "医院", "衣服", "椅子", "有", "月", "再见", "在", "怎么", "怎么样", "这", "中国", "中午", "住", "桌子", "字", "昨天", "做", "坐",
    ]
    return set(words)


def load_hsk1_csv_words(root: Path) -> list[str]:
    """Load the first column (question/Chinese) from all HSK1 set CSVs.

    Returns a list to preserve duplicates for diagnostics; use set() when comparing.
    """
    pattern = str(root / "Recognition_Practice/HSK_Level_1/HSK1_Set_*_flashcards.csv")
    words: list[str] = []
    for file_path in sorted(glob.glob(pattern)):
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                if not row:
                    continue
                words.append(row[0].strip())
    return words


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    official = load_official_hsk1_words()
    csv_words_list = load_hsk1_csv_words(root)
    csv_words = set(csv_words_list)

    duplicates = sorted([w for w in csv_words_list if csv_words_list.count(w) > 1])
    missing = sorted(official - csv_words)
    extras = sorted(csv_words - official)

    print(f"Official HSK1 count: {len(official)}")
    print(f"CSV unique count:    {len(csv_words)}")
    print(f"CSV total entries:   {len(csv_words_list)} (should be 150)")

    status = "MATCH" if not missing and not extras and len(csv_words) == 150 else "MISMATCH"
    print(f"Status: {status}")

    if duplicates:
        # show unique duplicates while preserving order in 'duplicates'
        seen = set()
        dup_unique = []
        for w in duplicates:
            if w not in seen:
                seen.add(w)
                dup_unique.append(w)
        print("\nDuplicate entries across CSVs:")
        for w in dup_unique:
            print(w)

    if missing:
        print("\nMissing from CSVs (in official, not in CSVs):")
        for w in missing:
            print(w)

    if extras:
        print("\nExtra in CSVs (not in official list):")
        for w in extras:
            print(w)


if __name__ == "__main__":
    main()


