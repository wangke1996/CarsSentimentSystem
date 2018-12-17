from global_var import gl
import random
import sys
# import SentimentAnalysisModule.model_CNN
# from SentimentAnalysisModule.model_CNN import *
# import SentimentAnalysisModule.model_MNKG
# import SentimentAnalysisModule.preprocess
from new_fine_grained import ltp_init, analysis_comment

def build_test_datas():
    import random
    kb = gl.get_value('KNOWLEDGE_BASE')
    E = set(random.sample(kb.entitySet, 10))
    A = set()
    EADS = set()
    for e in E:
        attributes = kb.attributes_of_entity(e)
        attributes = random.sample(attributes, min((len(attributes), 5)))
        A.update(attributes)
        for a in attributes:
            descriptions = list(kb.descriptions_of_target(a)) + list(kb.descriptions_of_target(e))
            descriptions = random.sample(descriptions, min((len(descriptions), 5)))
            for d in descriptions:
                sentence_num = random.randint(0, 3)
                for i in range(sentence_num):
                    s = e + '的' + a + '很' + d + str(i)
                    EADS.add((e, a, d, s))
    EA = dict()
    AE = dict()
    for e, a, d, s in EADS:
        if e not in EA:
            EA[e] = dict()
        if a not in EA[e]:
            EA[e][a] = {'POS': dict(), 'NEU': dict(), 'NEG': dict()}
        sentiment = kb.sentiment_of_target_description_pair(e, d,
                                                            check_hint=False) or kb.sentiment_of_target_description_pair(
            a, d, check_hint=False)
        if d not in EA[e][a][sentiment]:
            EA[e][a][sentiment][d] = set()
        EA[e][a][sentiment][d].add(s)

        if a not in AE:
            AE[a] = dict()
        if e not in AE[a]:
            AE[a][e] = {'POS': dict(), 'NEU': dict(), 'NEG': dict()}
        if d not in AE[a][e][sentiment]:
            AE[a][e][sentiment][d] = set()
        AE[a][e][sentiment][d].add(s)
    return EA, AE


def merge_results(result_list):
    entity_index_result = dict()
    attribute_index_result = dict()
    for r in result_list:
        entity = r['entity']
        attribute = r['attribute']
        description = r['description']
        sentiment = r['polarity']
        sentence = r['sentence']
        if entity not in entity_index_result:
            entity_index_result[entity] = dict()
        if attribute not in entity_index_result[entity]:
            entity_index_result[entity][attribute] = {'POS': dict(), 'NEU': dict(), 'NEG': dict()}
        if description not in entity_index_result[entity][attribute][sentiment]:
            entity_index_result[entity][attribute][sentiment][description] = set()
        entity_index_result[entity][attribute][sentiment][description].add(sentence)

        if attribute not in attribute_index_result:
            attribute_index_result[attribute] = dict()
        if entity not in attribute_index_result[attribute]:
            attribute_index_result[attribute][entity] = {'POS': dict(), 'NEU': dict(), 'NEG': dict()}
        if description not in attribute_index_result[attribute][entity][sentiment]:
            attribute_index_result[attribute][entity][sentiment][description] = set()
        attribute_index_result[attribute][entity][sentiment][description].add(sentence)
    return entity_index_result,attribute_index_result



def sort_by_freq(result_tree):
    freq_dict = dict()
    for k, i in result_tree.items():
        pos_sentence = set.union(
            *[set.union(*y) for y in [x['POS'].values() for x in i.values()] if len(y) > 0] or [set()])
        neu_sentence = set.union(
            *[set.union(*y) for y in [x['NEU'].values() for x in i.values()] if len(y) > 0] or [set()])
        neg_sentence = set.union(
            *[set.union(*y) for y in [x['NEG'].values() for x in i.values()] if len(y) > 0] or [set()])
        pos_freq = len(pos_sentence)
        neu_freq = len(neu_sentence)
        neg_freq = len(neg_sentence)
        freq = pos_freq + neu_freq + neg_freq
        pos_sample = random.sample(pos_sentence, min(pos_freq, 5))
        neu_sample = random.sample(neu_sentence, min(neu_freq, 5))
        neg_sample = random.sample(neg_sentence, min(neg_freq, 5))
        freq_dict[k] = {'freq': [pos_freq, neu_freq, neg_freq], 'review': [pos_sample, neu_sample, neg_sample]}
    return freq_dict


# def test():
#     EA, AE = build_test_datas()
#     target_freq = sort_by_freq(EA)
#     target_freq.update(sort_by_freq(AE))
#     return target_freq

def test():
    ltp_init()
    knowledgebase = gl.get_value('KNOWLEDGE_BASE')
    sentence = '我的小白四个圈刚提回来1个月不到，没首保跑了一次高速，那是相当的省油啊，平均时速120的时候，百公里油耗才6升！动力非常爽，驾驶的感觉不是一般的扎实，国内目前除了法拉利等系列的顶级车没开过，基本我也算是老百姓能开过的车我都开过了，15多年的车龄，就目前来说开得最踏实的就是新奥迪A4，外观就不需要我赞扬了是人都知道，内饰低调而不失时尚运动奢华，空间也很舒服，我1米7以上的个头感觉非常合适，总之是中高档车的首选入门车款。说到缺点就不得不说说一些小毛病了，比如大灯喷水器收不回来，经4S店几次调试目前还算是弄好了，每次启动踩油门起步的时候似乎油门有铁丝一样的东西都要拉住油门一下，传到我身上感觉非常的不爽，不知道是什么原因，打算首保的时候让4S店查一下。还有就是为什么40多万外观那么运动的车就不原配一个2254518R的轮子呢？这样外观在这个价位的车型中那就是无可挑剔的了。很不错的一款中高档车入门车型。选他没错，你信不信我不知道，反正我是信了。'
    sentiments = analysis_comment(sentence, knowledgebase=knowledgebase, debug=True, file=sys.stdout)
    # index = dict()
    # index = update_index(sentiments, index)
    # for x in sentiments:
    #     print(x)
    EA, AE = merge_results(sentiments)
    target_freq = sort_by_freq(EA)
    target_freq.update(sort_by_freq(AE))
    return target_freq