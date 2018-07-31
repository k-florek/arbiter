#!/bin/bash
find . -name "*_resFind.csv" | xargs cat > resFind_all.csv;
find . -name "*_CARD.csv" | xargs cat > card_all.csv;
find . -name "*_NCBIres.csv" | xargs cat > NCBIres_all.csv;
find . -name "*_mlst.csv" | xargs cat > mlst_all.csv;
find . -name "*_vf.csv" | xargs cat > vf_all.csv
