(() => {
  const DIFFS = {
    beginner: { cols: 9, rows: 9, mines: 15, label: "初级" },
    intermediate: { cols: 16, rows: 16, mines: 55, label: "中级" },
    expert: { cols: 30, rows: 16, mines: 120, label: "高级" },
  };

  const boardEl = document.getElementById("board");
  const mineCountEl = document.getElementById("mine-count");
  const timerEl = document.getElementById("timer");
  const faceEl = document.getElementById("face");
  const statusEl = document.getElementById("status");
  const diffButtons = [...document.querySelectorAll(".diff")];

  let diffKey = "intermediate";
  let cols = 16;
  let rows = 16;
  let mineTotal = 55;
  /** @type {{ mine:boolean, open:boolean, flag:boolean, n:number }[]} */
  let cells = [];
  let started = false;
  let over = false;
  let won = false;
  let flags = 0;
  let opened = 0;
  let seconds = 0;
  let timerId = null;
  let pressTimer = null;
  let longPressed = false;

  function pad3(n) {
    const v = Math.max(0, Math.min(999, n | 0));
    return String(v).padStart(3, "0");
  }

  function setFace(emoji) {
    faceEl.textContent = emoji;
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(() => {
      seconds += 1;
      timerEl.textContent = pad3(seconds);
    }, 1000);
  }

  function idx(x, y) {
    return y * cols + x;
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < cols && y < rows;
  }

  function neighbors(x, y) {
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (inBounds(nx, ny)) out.push([nx, ny]);
      }
    }
    return out;
  }

  function cellSizeFor() {
    const maxW = Math.min(window.innerWidth - 48, 960);
    const size = Math.floor((maxW - 24) / cols) - 2;
    return Math.max(16, Math.min(34, size));
  }

  function placeMines(safeX, safeY) {
    // Only the first clicked cell is guaranteed safe (harder than clearing a 3x3).
    const forbidden = new Set([idx(safeX, safeY)]);
    let placed = 0;
    let guard = 0;
    while (placed < mineTotal && guard < 100000) {
      guard += 1;
      const i = (Math.random() * cols * rows) | 0;
      if (forbidden.has(i) || cells[i].mine) continue;
      cells[i].mine = true;
      placed += 1;
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = idx(x, y);
        if (cells[i].mine) {
          cells[i].n = 0;
          continue;
        }
        let n = 0;
        for (const [nx, ny] of neighbors(x, y)) {
          if (cells[idx(nx, ny)].mine) n += 1;
        }
        cells[i].n = n;
      }
    }
  }

  function updateHud() {
    mineCountEl.textContent = pad3(mineTotal - flags);
    timerEl.textContent = pad3(seconds);
  }

  function paintCell(i) {
    const el = boardEl.children[i];
    if (!el) return;
    const c = cells[i];
    el.className = "cell";
    el.disabled = over && !c.open;
    el.textContent = "";
    if (c.flag && !c.open) {
      el.classList.add("flagged");
      el.textContent = "🚩";
      return;
    }
    if (!c.open) return;
    el.classList.add("open");
    if (c.mine) {
      el.classList.add("mine");
      el.textContent = "💣";
      return;
    }
    if (c.n > 0) {
      el.classList.add("n" + c.n);
      el.textContent = String(c.n);
    }
  }

  function revealAllMines(burstIndex) {
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const el = boardEl.children[i];
      if (c.mine) {
        c.open = true;
        paintCell(i);
        if (i === burstIndex) el.classList.add("burst");
      } else if (c.flag) {
        el.classList.add("wrong");
        el.textContent = "❌";
      }
    }
  }

  function checkWin() {
    if (opened === cols * rows - mineTotal) {
      over = true;
      won = true;
      stopTimer();
      setFace("😎");
      statusEl.textContent = "胜利！用时 " + seconds + " 秒";
      statusEl.className = "status win";
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].mine && !cells[i].flag) {
          cells[i].flag = true;
          flags += 1;
          paintCell(i);
        }
      }
      updateHud();
    }
  }

  function floodOpen(sx, sy) {
    const stack = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop();
      const i = idx(x, y);
      const c = cells[i];
      if (c.open || c.flag || c.mine) continue;
      c.open = true;
      opened += 1;
      paintCell(i);
      if (c.n === 0) {
        for (const [nx, ny] of neighbors(x, y)) {
          const ni = idx(nx, ny);
          if (!cells[ni].open && !cells[ni].flag) stack.push([nx, ny]);
        }
      }
    }
  }

  function openAt(x, y) {
    if (over) return;
    const i = idx(x, y);
    const c = cells[i];
    if (c.open || c.flag) return;

    if (!started) {
      started = true;
      placeMines(x, y);
      startTimer();
      setFace("🙂");
    }

    if (c.mine) {
      over = true;
      won = false;
      stopTimer();
      setFace("💀");
      statusEl.textContent = "踩雷了，再来一局？";
      statusEl.className = "status lose";
      revealAllMines(i);
      return;
    }

    floodOpen(x, y);
    checkWin();
  }

  function toggleFlag(x, y) {
    if (over) return;
    const i = idx(x, y);
    const c = cells[i];
    if (c.open) return;
    c.flag = !c.flag;
    flags += c.flag ? 1 : -1;
    paintCell(i);
    updateHud();
  }

  function chord(x, y) {
    if (over) return;
    const i = idx(x, y);
    const c = cells[i];
    if (!c.open || c.n === 0) return;
    let flagged = 0;
    const closed = [];
    for (const [nx, ny] of neighbors(x, y)) {
      const n = cells[idx(nx, ny)];
      if (n.flag) flagged += 1;
      else if (!n.open) closed.push([nx, ny]);
    }
    if (flagged !== c.n) return;
    for (const [nx, ny] of closed) openAt(nx, ny);
  }

  function bindCell(el, x, y) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (longPressed) {
        longPressed = false;
        return;
      }
      const c = cells[idx(x, y)];
      if (c.open) {
        chord(x, y);
        return;
      }
      openAt(x, y);
    });
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      toggleFlag(x, y);
    });
    el.addEventListener("auxclick", (e) => {
      if (e.button === 1) {
        e.preventDefault();
        chord(x, y);
      }
    });
    el.addEventListener("mousedown", (e) => {
      if (e.button === 0 && !over) setFace("😮");
    });
    el.addEventListener("mouseup", () => {
      if (!over) setFace(won ? "😎" : "🙂");
    });
    el.addEventListener("mouseleave", () => {
      if (!over) setFace(won ? "😎" : "🙂");
    });

    el.addEventListener("touchstart", () => {
      longPressed = false;
      pressTimer = setTimeout(() => {
        longPressed = true;
        toggleFlag(x, y);
        if (navigator.vibrate) navigator.vibrate(12);
      }, 420);
    }, { passive: true });
    const clearPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };
    el.addEventListener("touchend", clearPress);
    el.addEventListener("touchmove", clearPress);
    el.addEventListener("touchcancel", clearPress);
  }

  function buildBoard() {
    const size = cellSizeFor();
    boardEl.style.setProperty("--cell-size", size + "px");
    boardEl.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
    boardEl.innerHTML = "";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cell";
        btn.setAttribute("role", "gridcell");
        btn.setAttribute("aria-label", `${x + 1},${y + 1}`);
        bindCell(btn, x, y);
        boardEl.appendChild(btn);
      }
    }
  }

  function reset() {
    const d = DIFFS[diffKey];
    cols = d.cols;
    rows = d.rows;
    mineTotal = d.mines;
    cells = Array.from({ length: cols * rows }, () => ({
      mine: false,
      open: false,
      flag: false,
      n: 0,
    }));
    started = false;
    over = false;
    won = false;
    flags = 0;
    opened = 0;
    seconds = 0;
    stopTimer();
    setFace("🙂");
    statusEl.textContent = "";
    statusEl.className = "status";
    buildBoard();
    updateHud();
  }

  diffButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      diffKey = btn.dataset.diff;
      diffButtons.forEach((b) => b.classList.toggle("active", b === btn));
      reset();
    });
  });

  faceEl.addEventListener("click", reset);
  window.addEventListener("resize", () => {
    const size = cellSizeFor();
    boardEl.style.setProperty("--cell-size", size + "px");
    boardEl.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
  });

  document.addEventListener("selectstart", (e) => e.preventDefault());

  reset();
})();
