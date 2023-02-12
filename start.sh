#!/bin/bash

source .profile
echo $RDMRoot
python djangoProject/manage.py runserver $1
