import { useEffect, useRef } from 'react';
import { Renderer } from '../engine/renderer';
import { engine } from '../engine/engine';
import { projectDuration, useEditor } from '../store';
import { formatTime } from '../util';

export function Preview({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const rendererRef = useRef<Renderer | null>(null);
  const { time, playing, setPlaying, project } = useEditor();
  const duration = projectDuration(project);

  // Render loop: advances the clock while playing and draws every animation frame.
  useEffect(() => {
    const canvas = canvasRef.current!;
    try {
      rendererRef.current = new Renderer(canvas);
    } catch (e) {
      console.error(e);
      return;
    }
    const clock = { last: performance.now(), raf: 0 };
    const loop = (now: number) => {
      const s = useEditor.getState();
      const dt = Math.min(0.1, (now - clock.last) / 1000);
      clock.last = now;
      if (s.playing) {
        const end = projectDuration(s.project);
        const next = s.time + dt;
        if (next >= end) {
          s.setTime(end);
          s.setPlaying(false);
        } else s.setTime(next);
      }
      const { project, time, playing } = useEditor.getState();
      const { layers, ready } = engine.sync(project, time, playing);
      // While a video is still seeking, keep showing the previous frame instead of flashing black.
      if (ready || playing) rendererRef.current?.render(project, time, layers);
      clock.raf = requestAnimationFrame(loop);
    };
    clock.raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(clock.raf);
      engine.pauseAll();
    };
  }, [canvasRef]);

  const toggle = () => {
    engine.ensureAudio();
    if (!playing && time >= duration) useEditor.getState().setTime(0);
    setPlaying(!playing);
  };

  return (
    <div className="preview">
      <div className="preview-stage">
        <canvas ref={canvasRef} style={{ aspectRatio: `${project.width} / ${project.height}` }} />
      </div>
      <div className="transport">
        <button onClick={() => useEditor.getState().setTime(0)} title="Go to start (Home)">⏮</button>
        <button className="play" onClick={toggle} title="Play / pause (Space)">{playing ? '❚❚' : '▶'}</button>
        <span className="timecode">
          {formatTime(time, project.fps)} <span className="dim">/ {formatTime(duration, project.fps)}</span>
        </span>
      </div>
    </div>
  );
}
