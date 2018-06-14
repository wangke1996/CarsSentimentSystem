# coding=utf-8
# encoding=utf8
from __future__ import print_function

import sys
import imp

imp.reload(sys)
# sys.setdefaultencoding('utf8')

import copy

from .CONFIG import CONF
# from .ENEITY2SENTIMENT import entities2sentiments_group
# from .ENEITY2SENTIMENT import entities2sentiments_single
from .GRAMMAR_ANALYSIS import grammar_analysis
from .INIT import init_knowledge_base
from .PRETREAT import clean_text, split_sentences
from .SENTIMENT_ANALYSIS import sentiment_analysis


# from global_var import gl
# from time import time
# from multiprocessing import cpu_count
# from .CONFIG_LTP import CONF_LTP
# 记录需要保存的关键词
def analysis_comment(text, init_data, model, unlabeled_text=[],pid=0):
    """处理单条评论的api接口
    处理流程：
        - 预处理
        - 分句
        - 逐句：
            - 情感分析
            - aspect抽取
            - 结果后处理
        - 汇总得到整个评论的结果
    """
    # print('文本内容:\n', text, '\n')


    # CONF_LTP.LTP_CWS_THREAD=str(thread_num)sorted_unique_words = set()
    sorted_unique_words = set()
    sorted_unique_words_entities = set()
    sorted_unique_words_attributes = set()
    sorted_unique_words_va = set()
    # CONF_LTP.LTP_PAR_THREAD=str(thread_num)
    # CONF_LTP.LTP_POS_THREAD=str(thread_num)
    #
    # sorted_unique_words = gl.get_value('SORTED_UNIQUE_WORDS',set())
    # sorted_unique_words_entities = gl.get_value('SORTED_UNIQUE_WORDS_ENTITIES',set())
    # sorted_unique_words_attributes = gl.get_value('SORTED_UNIQUE_WORDS_ATTRIBUTES',set())
    # sorted_unique_words_va = gl.get_value('SORTED_UNIQUE_WORDS_VA',set())

    entities = init_data['entities']
    term2entity = init_data['term2entity']
    va2attributes = init_data['va2attributes']
    term2attributes = init_data['term2attributes']
    entity2term = init_data['entity2term']
    attributes2term = init_data['attributes2term']
    va2confidence = init_data['va2confidence']
    va2polar = init_data['va2polar']
    this_entities = copy.deepcopy(entities)

    text = clean_text(text)
    sents = split_sentences(text)
    # start=time()
    words_list, postags_list, arcs_list = grammar_analysis(pid=pid, text_list=sents, term2entity=term2entity,
                                                           va2attributes=va2attributes,
                                                           term2attributes=term2attributes,
                                                           sorted_unique_words=sorted_unique_words,
                                                           sorted_unique_words_entities=sorted_unique_words_entities,
                                                           sorted_unique_words_attributes=sorted_unique_words_attributes,
                                                           sorted_unique_words_va=sorted_unique_words_va)
    # print('grammar analysis by %d process, time use: %ds' % (thread_num, time() - start))
    try:
        state_list = sentiment_analysis(model=model, text_list=sents, words_list=words_list, arcs_list=arcs_list,
                                        entities=this_entities,
                                        term2entity=term2entity, va2attributes=va2attributes, va2polar=va2polar,
                                        term2attributes=term2attributes,
                                        sorted_unique_words=sorted_unique_words,
                                        sorted_unique_words_entities=sorted_unique_words_entities,
                                        sorted_unique_words_attributes=sorted_unique_words_attributes,
                                        sorted_unique_words_va=sorted_unique_words_va,
                                        entity2term=entity2term,
                                        attributes2term=attributes2term,
                                        va2confidence=va2confidence,unlabeled_text=unlabeled_text)
    except Exception as e:
        raise (e)
    # print('pid=%d text=%s' % (pid, text))
    # state_list.sort(reverse=True,key=lambda x:x.confidence)
    # sentiments = entities2sentiments_group(this_entities)
    # return sentiments
    return None, state_list


if __name__ == '__main__':

    use_nn = False

    init_data = init_knowledge_base()

    sentiments = analysis_comment(text=CONF.TEST_COMMENT, debug=True, file=None, init_data=init_data)

    for x in sentiments:
        print(x[0], x[1], x[2], x[3], x[4])
