# coding=utf-8
# encoding=utf8
from __future__ import print_function
import os.path
import sys
import imp

imp.reload(sys)


# sys.setdefaultencoding('utf8')

class Config(object):
    # 基本设置
    def __init__(self, product):
        # test comment
        self.TEST_COMMENT = u'''方向盘外观很好看，但手感不太舒适'''

        # project path
        self.PROJECT_PATH = os.path.abspath('./Fine_grained') + '/'

        # fine_grained path
        self.FINE_GRAINED_PATH = self.PROJECT_PATH + 'Src/Fine_grained/'

        # lib path
        self.LIB_PATH = os.path.abspath('./KnowledgeBase') + '/' + product + '/'
        self.WHOLE_PART_PATH = self.LIB_PATH + 'whole-part.txt'
        self.ENTITY_SYNONYM_PATH = self.LIB_PATH + 'entity-synonym.txt'
        self.ATTRIBUTE_DESCRIPTION_PATH = self.LIB_PATH + 'attribute-description.txt'
        self.NA_OUT_PATH = self.LIB_PATH + 'na_out.txt'
        self.ATTRIBUTE_SYNONYM_PATH = self.LIB_PATH + 'attribute-synonym.txt'
        self.ENTITY_ATTRIBUTE_PATH = self.LIB_PATH + 'entity-attribute.txt'
        self.SUBSET_PATH = self.LIB_PATH + 'subset.txt'

        # refine_score path
        self.ENTITY_DIR = self.PROJECT_PATH + 'score_refine/' + product + '/Experiment_Embedding_entity.txt'
        self.GOOD_RELATION_DIR = self.PROJECT_PATH + 'score_refine/' + product + '/Experiment_Embedding_relation_good.txt'
        self.BAD_RELATION_DIR = self.PROJECT_PATH + 'score_refine/' + product + '/Experiment_Embedding_relation_bad.txt'
        self.NEU_RELATION_DIR = self.PROJECT_PATH + 'score_refine/' + product + '/Experiment_Embedding_relation_neu.txt'
        self.WEIGHT_DIR = self.PROJECT_PATH + 'score_refine/' + product + '/Experiment_Embedding_weight.txt'

        # unlabeled text path
        import datetime
        self.UNLABELED_TEXT_PATH = os.path.abspath(
            './UnlabeledText' + '/' + product + '/' + datetime.datetime.now().strftime('%Y%m%d_%H%M%S') + '.txt')
        # word2vec path
        self.WORD2VEC_PATH = self.PROJECT_PATH + 'Word2vec/word2vec_wx'
        self.SIMILARITY_ENTITY_PATH=self.LIB_PATH+'similarity/similarity_entity.dat'
        self.SIMILARITY_ATTRIBUTE_PATH=self.LIB_PATH+'similarity/similarity_attribute.dat'


        # temp path
        self.TEMP_PATH = self.FINE_GRAINED_PATH + 'Temp/'
        self.TEXT_SEG_PATH = self.TEMP_PATH + 'text_seg.txt'
        self.TEXT_CWS_PATH = self.TEMP_PATH + 'text_cws.txt'
        self.TEXT_POS_PATH = self.TEMP_PATH + 'text_pos.txt'
        self.TEXT_PAR_PATH = self.TEMP_PATH + 'text_par.txt'

        # supplement path
        self.SUPPLEMENT_PATH = self.LIB_PATH + 'supplement/'
        self.PREFIX_PATH = self.SUPPLEMENT_PATH + 'prefix.txt'
        self.SUFIX_PATH = self.SUPPLEMENT_PATH + 'sufix.txt'
        self.SUB_PATH = self.SUPPLEMENT_PATH + 'sub.txt'
        self.SUPPLEMENT_ATTRIBUTE_DESCRIPTION_PATH = self.SUPPLEMENT_PATH + 'attribute-description.txt'

        self.UNIQUE = 'xxx'

        self.NA_LIMITH = 1
        self.CONFIDENCE_LIMITH = 5


CONF = Config('汽车')
