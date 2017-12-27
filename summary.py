from collections import Counter
from pprint import pprint
from tqdm import tqdm
def gen_summary(texts=None, filename=None, init_data=None, use_nn=True):
    if not texts:
        texts = load_texts(filename)
    smr = dict()
    total = 0
    for text in tqdm(texts, desc='analyzing'):
        aspects, sentiments, nn_aspect, nn_sentiment, details = analysis_comment(text, debug=False, use_nn=use_nn, **init_data)
        for aspect in details.keys():
            if '-' in aspect:
                lv1, lv2 = aspect.split('-')
            else:
                lv1, lv2 = aspect, GENERAL
            for pol in details[aspect].keys():
                smr.setdefault(lv1, dict()).setdefault(lv2, dict()).setdefault(pol, Counter()).update(details[aspect][pol])
                total += len(details[aspect][pol])
    # pprint(smr)
    print(total)

    counter = dict()
    for lv1 in smr:
        for lv2 in smr[lv1]:
            # pos-num, neg-num, all-num, pos-rate, neg-rate, all-rate
            counter.setdefault(lv1, dict()).setdefault(lv2, [0, 0, 0, .0, .0, .0])
            counter[lv1][lv2][0] = len(smr[lv1][lv2].get('正面', dict()))
            counter[lv1][lv2][1] = len(smr[lv1][lv2].get('负面', dict()))
            counter[lv1][lv2][2] = counter[lv1][lv2][0] + counter[lv1][lv2][1]
            counter[lv1][lv2][3] = '{:.3%}'.format(counter[lv1][lv2][0] / total)
            counter[lv1][lv2][4] = '{:.3%}'.format(counter[lv1][lv2][1] / total)
            counter[lv1][lv2][5] = '{:.3%}'.format(counter[lv1][lv2][2] / total)
    # pprint(counter)
    # write to csv
    headers = ['一级分类', '二级分类', '评价极性', '评价数目', '评价占比', '评价示例']
    rows = []
    for lv1 in smr:
        for lv2 in smr[lv1]:
            if counter[lv1][lv2][0] > 0:
                rows.append({
                    '一级分类': lv1,
                    '二级分类': lv2,
                    '评价极性': '正面',
                    '评价数目': counter[lv1][lv2][0],
                    '评价占比': counter[lv1][lv2][3],
                    '评价示例': ' || '.join(smr[lv1][lv2]['正面'].keys())
                })
            if counter[lv1][lv2][1] > 0:
                rows.append({
                    '一级分类': lv1,
                    '二级分类': lv2,
                    '评价极性': '负面',
                    '评价数目': counter[lv1][lv2][1],
                    '评价占比': counter[lv1][lv2][4],
                    '评价示例': ' || '.join(smr[lv1][lv2]['负面'].keys())
                })
    csv_filepath = filename.replace('.txt', '.csv')
    with codecs.open('./static/downloads/' + csv_filepath, 'w', 'utf-8-sig') as fw:
        f_csv = csv.DictWriter(fw, headers)
        f_csv.writeheader()
        f_csv.writerows(rows)
    return counter, csv_filepath
import csv

import codecs

from fine_grained import analysis_comment


GENERAL = '整体描述'


def load_texts(filename):
    texts = []
    try:
        with open('./uploads/' + filename, 'r', encoding='utf8') as fr:
            for line in fr:
                    texts.append(line.strip())
    except:
        pass
    return texts


def main():
    pass


if __name__ == '__main__':
    main()

    print('\nProcess finished')

