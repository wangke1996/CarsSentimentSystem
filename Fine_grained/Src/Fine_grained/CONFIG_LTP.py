# coding=utf-8
# encoding=utf8
from __future__ import print_function

import sys

import imp
imp.reload(sys)
import os.path
#sys.setdefaultencoding('utf8')


class Config_ltp(object):
    # 基本设置
    def __init__(self):
        self.PROJECT_PATH = os.path.abspath('./Fine_grained')+'/'

        self.LTP_PATH = self.PROJECT_PATH + 'Ltp/'

        self.LTP_CWS_NAME = self.LTP_PATH+'cws_cmdline'
        self.LTP_CWS_THREAD = '1'

        self.LTP_POS_NAME = self.LTP_PATH+'pos_cmdline'
        self.LTP_POS_THREAD = '1'

        self.LTP_PAR_NAME = self.LTP_PATH+'par_cmdline'
        self.LTP_PAR_THREAD = '1'


CONF_LTP = Config_ltp()
