"""Print the vocal stem's 25 ms RMS, pitch and onset strength over a window, with the aligned word starts marked.
Run: uv run python rms.py T0 T1   (the evidence behind align.py's FIX entries)
"""
import sys, json, numpy as np
f=np.load('work/vocal_feats.npz'); h=float(f['hop_s']); r=f['rms_db']; f0=f['f0']; on=f['onset']
W=json.load(open('../data/lyrics.json',encoding='utf-8'))
words=[(w['start'],w['end'],w['w'],l['i']) for l in W['lines'] for w in l['words']]
t0,t1=float(sys.argv[1]),float(sys.argv[2]); step=int(0.025/h)
for i in range(int(t0/h),int(t1/h),step):
    t=i*h; lab=' '.join(f"<{w}L{li}" for s,e,w,li in words if t<=s<t+step*h)
    hz=np.nanmedian(f0[i:i+step]) if not np.isnan(f0[i:i+step]).all() else 0
    print(f"{t:7.3f} {r[i:i+step].mean():6.1f}dB {hz:5.0f}Hz on{on[i:i+step].max():5.1f} {'#'*int(max(0,(r[i:i+step].mean()+60)/2))} {lab}")
