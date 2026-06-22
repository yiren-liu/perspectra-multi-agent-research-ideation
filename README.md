# Perspectra

**Perspectra** is a forum-style, multi-agent system that helps researchers explore and refine early-stage research ideas by deliberating with a panel of LLM-simulated domain experts.

This repository accompanies the CHI 2026 paper:

> **Perspectra: Choosing Your Experts Enhances Critical Thinking in Multi-Agent Research Ideation.**
> Yiren Liu, Viraj Nischal Shah, Sangho Suh, Pao Siangliulue, Tal August, Yun Huang.
> *Proceedings of the 2026 CHI Conference on Human Factors in Computing Systems (CHI '26).*
> [doi:10.1145/3772318.3791560](https://doi.org/10.1145/3772318.3791560) ·
> [arXiv:2509.20553](https://arxiv.org/abs/2509.20553)

---

## Overview

The app has two conditions (as reported in the paper):

- **`/forum` — Perspectra (default).** Expert personas open and reply to discussion **threads**,
  rendered as a mind map. You can inspect each persona's knowledge graph, favorite posts/threads,
  invite more experts, and generate a project summary report.
- **`/chat` — baseline.** A linear multi-agent **group chat** used as the study's comparison
  condition.


## Prerequisites

- **Python 3.11**
- **Node.js 18+** and npm
- An **OpenAI** or **Azure OpenAI** API key
- A **Supabase** project (URL, anon key, service key, JWT secret)
- Optional: a **Semantic Scholar** API key and/or **OpenAlex** access for higher paper-search limits

## Quick start

### 1. Backend

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.prod.txt       
cp .env.example .env                  
uvicorn main:app --host 0.0.0.0 --port 8321 --reload
```

The API is served at `http://localhost:8321/api/v1`; interactive docs at
`http://localhost:8321/docs`.

> `requirements.prod.txt` is the complete pinned dependency set (also used by the Docker image).
> `requirements.txt` is a lighter development list. See [`backend/README.md`](backend/README.md)
> for details, the Supabase schema migration, and the `USER_STUDY_MODE` flag.

### 2. Frontend

```bash
cd frontend/personachat
npm install
cp .env.example .env                          # then fill in your values
npm run dev                                    # http://localhost:3000
```

The dev server proxies `/api/v1` and `/health` to the backend at `VITE_PROXY_TARGET`
(default `http://127.0.0.1:8321`). See [`frontend/personachat/README.md`](frontend/personachat/README.md).

## Configuration

Copy the `.env.example` in each package and fill in the values. Most keys are optional; the
minimum to run is an LLM key plus a Supabase project.

## Contact

For questions, feel free to reach out to **Yiren Liu** at
[yirenl2@illinois.edu](mailto:yirenl2@illinois.edu). Bug reports and feature requests are also
welcome via [GitHub issues](https://github.com/yiren-liu/perspectra-multi-agent-research-ideation/issues).

## License

Released under the [Apache License 2.0](LICENSE).


