#!/bin/sh
# Roda o bestiário inteiro na ordem certa e confere no fim.
set -e
cd "$(dirname "$0")/../.."
python3 tools/bestiario/extrair-adversarios.py
python3 tools/bestiario/extrair-ambientes.py
python3 tools/bestiario/ligar-ambientes-a-adversarios.py
python3 tools/bestiario/conferir-com-srd.py
node tools/gerar-4F-bestiario.mjs
