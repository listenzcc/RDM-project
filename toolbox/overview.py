'''
File: overview.py
Author: Chuncheng, Zhang
Purpose:
Check the resources of the project
'''

# %%
import os
import numpy as np
from PIL import Image
import pandas as pd

from pathlib import Path

# %%


def _extension(name):
    '''
    Find the extension from the given name,
    if the name contains no dot '.' at all,
    return empty string as ''
    '''

    if '.' in name:
        return name.split('.')[-1]
    return ''


root_dir = Path(os.environ['RDMRoot'])
input_data = root_dir.joinpath('input_data')
data_folders = ['brain_data', 'stimuli_data']
image_folders = ['78images', '92images']


lst = []
for data in data_folders:
    for image in image_folders:
        p = input_data.joinpath(data, image)
        for e in [e for e in p.iterdir() if e.is_file()]:
            lst.append((data, image, e.name, _extension(e.name), e))

df = pd.DataFrame(lst,
                  columns=['module', 'set', 'name', 'extension', 'fullPath'])

# %%


def _npz(path):
    data = np.load(path)
    lst = []
    for key, value in data.items():
        lst.append((key, value.shape))
    return lst


def _jpg(path):
    img = Image.open(path)
    return img.size


for ext, func in zip(['npz', 'jpg'], [_npz, _jpg]):
    idx = df.query('extension == "{}"'.format(ext)).index
    df.loc[idx, 'detail'] = df.loc[idx, 'fullPath'].map(func)

public_columns = ['module', 'set', 'name', 'extension', 'detail']

resource_table_input_data = df
resource_table_input_data

# %%
