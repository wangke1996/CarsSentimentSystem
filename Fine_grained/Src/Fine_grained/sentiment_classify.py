# coding=UTF-8

import numpy as np
import math
import os

entity_vector_dic=None
relation_dic=None
weight_dic=None

def dic_init(entity_dir, good_relation_dir, bad_relation_dir, neu_relation_dir, weight_dir):
    global entity_vector_dic,relation_dic,weight_dic
    entity_vector_dic= makedic(entity_dir)
    relation_dic = [makedic(good_relation_dir), makedic(bad_relation_dir), makedic(neu_relation_dir)]
    weight_dic = makedic(weight_dir)
    return entity_vector_dic,relation_dic,weight_dic

def dic_change(dic1,dic2,dic3):
    global entity_vector_dic,relation_dic,weight_dic
    entity_vector_dic=dic1
    relation_dic=dic2
    weight_dic=dic3

def nam2id(num):
    return {
        0: '_good',
        1: '_bad',
        2: '_neutral'
    }.get(num)


def makedic(dir):
    with open(dir,encoding='utf8') as file:
        lines = file.readlines()
        vector_dic = {}
        for line in lines:
            items = line.strip().split("\t")
            entity = items.pop(0)
            vectors = []
            for vector in items:
                vectors.append(float(vector))
            npvec = np.asarray(vectors, dtype=float)
            npvec.shape = (1, len(vectors))
            vector_dic[entity] = npvec
    return vector_dic


def prob_triplets(attr, desp, rel):
    attr_vec = entity_vector_dic[attr]
    desp_vec = entity_vector_dic[desp]
    max_score = 1e-100
    for c in range(0, weight_dic[str(rel)].size):
        error_c = attr_vec + relation_dic[rel][str(c)] - desp_vec
        error_c = np.abs(error_c)
        max_score = max(max_score, math.fabs(weight_dic[str(rel)][0, c]) * math.exp(-error_c.sum()))
    return max_score


def rel_predict(attr, desp):
    good_score = prob_triplets(attr, desp, 0)
    bad_score = prob_triplets(attr, desp, 1)
    neu_score = prob_triplets(attr, desp, 2)
    if good_score == max(good_score, bad_score, neu_score):
        return 1  # "_good"
    elif bad_score == max(good_score, bad_score, neu_score):
        return -1  # "_bad"
    else:
        return 0  # "_neutral"


if __name__ == '__main__':
    entity_dir = "../../score_/Experiment_Embedding_entity.txt"
    good_relation_dir = "./Experiment_Embedding_relation_good.txt"
    bad_relation_dir = "./Experiment_Embedding_relation_bad.txt"
    neu_relation_dir = "./Experiment_Embedding_relation_neu.txt"
    weight_dir = "./Experiment_Embedding_weight.txt"
    entity_vector_dic = makedic(entity_dir)
    relation_dic = [makedic(good_relation_dir), makedic(bad_relation_dir), makedic(neu_relation_dir)]
    weight_dic = makedic(weight_dir)
