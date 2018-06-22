# coding=utf-8
# encoding=utf8
from __future__ import print_function

import sys
import imp

imp.reload(sys)
# sys.setdefaultencoding('utf8')

from . import ATTRIBUTE
from . import ENEITY
from .CONFIG import CONF
from .sentiment_classify import dic_init


def load_enititiy(whole_part_path, entitiy_synonym_path):
    """加载预定义的实体设置"""

    print("加载预定义的entity设置...")

    # 加载实体间关系
    entities = []
    with open(whole_part_path, 'r', encoding='utf8') as fr:
        for line in fr:
            words = line.split('\t')
            entities = entities + [ENEITY.Entity(name=words[0])]

    num = 0
    with open(whole_part_path, 'r', encoding='utf8') as fr:
        for line in fr:
            line = line.strip('\n')
            line = line.strip('\t')
            line = line.strip('\r')
            line = line.split('\t')
            if len(line) != 1:
                line1 = line[1]
                words = line1.split(' ')
                for new_son in words:
                    for i in range(0, len(entities)):
                        if entities[i].name == new_son:
                            entities[num].add_son(entities[i])
                            entities[i].father = entities[num]
                            # print('father: ',entities[num].name,'\tson: ',entities[i].name,)
            num = num + 1

    # 加载实体与同义词关系
    term2entity = dict()
    entity2term = dict()
    with open(entitiy_synonym_path, 'r', encoding='utf8') as fr:
        for line in fr:
            line = line.strip().lower()
            line = line.strip('\n')
            line = line.strip('\t')
            line = line.split('\t')
            name = line[0]
            words = line[1].split(' ')
            for x in entities:
                if x.name == name:
                    entity2term[name] = words
                    for word in words:
                        term2entity[word] = x.name
                        # print('entity: ',x.name,'\tword: ',word)
    print("entity设置加载成功\n")
    return entities, term2entity, entity2term


def load_attribute(attribute_synonym_path, entity_attribute_path, entities):
    """加载预定义的属性设置"""

    print("加载预定义的attribute设置...")

    # 加载属性与同义词关系
    term2attributes = dict()
    attributes2term = dict()
    with open(attribute_synonym_path, 'r', encoding='utf8') as fr:
        for line in fr:
            line = line.strip().lower()
            line = line.strip('\n')
            line = line.strip('\t')
            line = line.split('\t')
            name = line[0]
            words = line[1].split(' ')
            attributes2term[name] = words
            for word in words:
                term2attributes[word] = name
                # print('attribute: ',name,'\tword: ',word)

    # 加载属性与实体间关系
    with open(entity_attribute_path, 'r', encoding='utf8') as fr:
        for line in fr:
            line = line.strip().lower()
            line = line.strip('\n')
            line = line.strip('\t')
            line = line.split('\t')
            name = line[0]
            words = line[1].split(' ')
            for x in entities:
                if x.name == name:
                    for word in words:
                        new_attribute = ATTRIBUTE.Attribute(name=word, father=x)
                        x.add_attribute(new_attribute=new_attribute)
                        # print('entity: ',x.name,'\tattribute: ',word)
    print("attribute设置加载成功\n")

    return term2attributes, attributes2term, entities


def load_va(na_out_path, supplement_path):
    """加载预定义的attribute设置..."""

    print("加载预定义的attribute设置...")

    va2attributes = dict()
    va2confidence = dict()
    va2polar = dict()

    # 加载形容词属性之间关系
    with open(na_out_path, 'r', encoding='utf8') as infile:
        for line in infile:
            line = line.strip().lower()
            line = line.strip('\n')
            line = line.split('\t')
            name = line[0]
            score = int(line[1])
            word = line[2]
            confidence = int(line[3])
            if confidence > CONF.NA_LIMITH:
                va2attributes[name, word] = score
                va2confidence[name, word] = confidence
        infile.close()

    # 加载补充的形容词属性关系
    with open(supplement_path, 'r', encoding='utf8') as infile:
        for line in infile:
            if line != '':
                line = line.strip('\n')
                line = line.split('\t')
                name = line[0]
                score = int(line[1])
                word = line[2]
                va2attributes[name, word] = score

    opinion_file = open(CONF.ATTRIBUTE_DESCRIPTION_PATH, encoding='utf8')
    try:
        all_lines = opinion_file.readlines()
        polarity = 2
        for line in all_lines:
            pair = line.split()
            polarity = polarity % 3 - 1
            if len(pair) < 2:
                continue
            aspect = pair[0]
            for opinion in pair[1:len(pair)]:
                va2attributes[(aspect, opinion)] = polarity
                unchange_polar = va2polar.setdefault(opinion, None)
                if unchange_polar is None:
                    va2polar[opinion] = polarity
                elif unchange_polar == -2:
                    continue
                elif unchange_polar != polarity:
                    va2polar[opinion] = -2
                else:
                    pass
    finally:
        opinion_file.close()

    temp = list(va2attributes.keys())
    temp.sort(key=lambda x: va2confidence.setdefault(x, 0), reverse=True)
    with open(na_out_path, 'w', encoding='utf8') as outfile:
        for (name, word) in temp:
            score = va2attributes.setdefault((name, word), None)
            confidence = va2confidence.setdefault((name, word), 0)
            outfile.write(name + '\t' + str(score) + '\t' + word + '\t' + str(confidence) + '\n')
        outfile.close()

    return va2attributes, va2confidence, va2polar


def load_refine(entity_dir, good_relation_dir, bad_relation_dir, neu_relation_dir, weight_dir):
    entity_vector_dic = makedic(entity_dir)
    relation_dic = [makedic(good_relation_dir), makedic(bad_relation_dir), makedic(neu_relation_dir)]
    weight_dic = makedic(weight_dir)
    return entity_vector_dic, relation_dic, weight_dic


def load_similarity(similarity_entity_dir, similarity_attribute_dir):
    import pickle
    f = open(similarity_entity_dir, 'rb')
    similarity_entity = pickle.load(f)
    f.close()
    f = open(similarity_attribute_dir, 'rb')
    similarity_attribute = pickle.load(f)
    f.close()
    return similarity_entity, similarity_attribute


def init_knowledge_base():
    """初始化语料库等资源"""

    print('正在进行初始化设置...')
    entities, term2entity, entity2term = load_enititiy(whole_part_path=CONF.WHOLE_PART_PATH,
                                                       entitiy_synonym_path=CONF.ENTITY_SYNONYM_PATH)
    term2attributes, attributes2term, entities = load_attribute(
        attribute_synonym_path=CONF.ATTRIBUTE_SYNONYM_PATH,
        entity_attribute_path=CONF.ENTITY_ATTRIBUTE_PATH,
        entities=entities)

    va2attributes, va2confidence, va2polar = load_va(na_out_path=CONF.NA_OUT_PATH,
                                                     supplement_path=CONF.SUPPLEMENT_ATTRIBUTE_DESCRIPTION_PATH)

    entity_vector_dic, relation_dic, weight_dic = dic_init(entity_dir=CONF.ENTITY_DIR,
                                                           good_relation_dir=CONF.GOOD_RELATION_DIR,
                                                           bad_relation_dir=CONF.BAD_RELATION_DIR,
                                                           neu_relation_dir=CONF.NEU_RELATION_DIR,
                                                           weight_dir=CONF.WEIGHT_DIR)

    similarity_entity, similarity_attribute = load_similarity(similarity_entity_dir=CONF.SIMILARITY_ENTITY_PATH,
                                                              similarity_attribute_dir=CONF.SIMILARITY_ATTRIBUTE_PATH)
    print('初始化设置成功！\n')
    # multiprocessing.freeze_support()
    init_data = dict(entities=entities, term2entity=term2entity, va2attributes=va2attributes,
                     term2attributes=term2attributes, entity2term=entity2term, attributes2term=attributes2term,
                     va2confidence=va2confidence, va2polar=va2polar, entity_vector_dic=entity_vector_dic,
                     relation_dic=relation_dic, weight_dic=weight_dic, similarity_entity=similarity_entity,
                     similarity_attribute=similarity_attribute)
    return init_data
    # return {
    #     'entities': entities,
    #     'term2entity': term2entity,
    #     'va2attributes': va2attributes,
    #     'term2attributes': term2attributes,
    #     'entity2term': entity2term,
    #     'attributes2term': attributes2term,
    #     'va2confidence': va2confidence
    # }
