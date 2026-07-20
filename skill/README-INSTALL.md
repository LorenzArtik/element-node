# Element Node Builder — AI Skill

Skill ufficiale per costruire siti Element Node con il tuo agente AI
(Claude Code, ma le istruzioni funzionano con qualsiasi coding agent, Codex incluso).

**La skill è gratuita e open source**: vive nella cartella `skill/` del repo
pubblico https://github.com/LorenzArtik/element-node. Con una licenza attiva
la scarichi sempre impacchettata e aggiornata dal pannello del CMS
(Impostazioni → API) o dall'area clienti di elementnode.cloud.

> Vuoi partire da zero (server compreso) con un solo prompt al tuo agente?
> Il template completo è su https://elementnode.cloud/it/docs#prompt

## Installazione rapida (consigliata)

```bash
# Con licenza — ultima versione dal license server:
bash <(curl -fsSL https://elementnode.cloud/install-skill.sh) enl_XXXX-XXXX-XXXX-XXXX

# Senza licenza — copia pubblica da GitHub:
bash <(curl -fsSL https://elementnode.cloud/install-skill.sh)
```

Rilancia lo stesso comando quando vuoi aggiornare la skill.

## Installazione manuale (Claude Code)

```bash
cp -r element-node-builder ~/.claude/skills/
cp agents/element-node-clone-comparator.md ~/.claude/agents/   # comparatore visivo (consigliato)
cd ~/.claude/skills/element-node-builder/scripts && npm install # per clone e visual diff
```

## Configurazione

```bash
export EN_URL="https://tuosito.com"
export EN_KEY="en_live_..."     # genera da /admin/api-keys (scope site.import + site.export)
export EN_EMAIL="admin@..."     # per upload asset
export EN_PASSWORD="..."
```

## Uso

Apri Claude Code e chiedi, ad esempio:
- "Clona https://esempio.com sul mio Element Node" (pipeline completa con visual diff)
- "Crea una landing per uno studio dentistico con hero, servizi e form"
- "Rifai la sezione servizi in stile bento moderno"

La skill contiene il riferimento completo dei 51 widget, le impostazioni di
sezioni e colonne, il playbook di redesign moderno e gli script di
clone/import/diff. L'agente costruisce con i widget nativi del CMS: il
risultato resta sempre editabile nell'editor visuale.

## Altri agenti (Codex, ecc.)

`element-node-builder/SKILL.md` e la cartella `references/` sono istruzioni in
markdown: passale a qualsiasi agente come contesto di progetto (es. AGENTS.md /
istruzioni custom). Gli script in `scripts/` sono Node.js standard.
