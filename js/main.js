(function () {
  const openButton = document.getElementById("openButton");
  const gate = document.getElementById("gate");
  const letter = document.getElementById("letter");
  const letterTitle = document.getElementById("letterTitle");

  let opened = false;
  let floatTween = null;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  function prefersReducedMotion() {
    return motionQuery.matches;
  }

  function showStatically() {
    document.documentElement.classList.add("ready-static");
  }

  function playChord() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.12);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.2);
    master.connect(ctx.destination);

    [261.63, 329.63, 392.0, 523.25].forEach(function (freq, index) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = index === 3 ? "triangle" : "sine";
      osc.frequency.value = freq;
      gain.gain.value = index === 3 ? 0.22 : 0.38;
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + 4.4);
    });

    window.setTimeout(function () {
      ctx.close();
    }, 4800);
  }

  function burst(origin) {
    if (prefersReducedMotion()) return;

    const rect = origin.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.42;
    const count = 16;

    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement("span");
      spark.className = "spark";
      spark.style.left = cx + "px";
      spark.style.top = cy + "px";
      if (i % 3 === 0) spark.style.width = spark.style.height = "4px";
      document.body.appendChild(spark);

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const distance = 60 + Math.random() * 100;

      gsap.to(spark, {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 30,
        autoAlpha: 0,
        scale: 0.3,
        duration: 0.9 + Math.random() * 0.35,
        ease: "power2.out",
        onComplete: function () {
          spark.remove();
        },
      });
    }
  }

  let journeyReady = false;
  let lineTween = null;

  function finishOpen() {
    gate.setAttribute("aria-hidden", "true");
    letter.setAttribute("aria-hidden", "false");
    letterTitle.focus({ preventScroll: true });
    document.body.classList.add("show-journey");
    if (!journeyReady) {
      journeyReady = true;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(setupJourney);
      });
    }
  }

  function layoutJourney() {
    const track = document.querySelector(".journey-track");
    if (!track) return null;

    const svg = track.querySelector(".journey-line");
    const guide = svg.querySelector(".line-guide");
    const draw = svg.querySelector(".line-draw");
    const knots = Array.prototype.slice.call(track.querySelectorAll(".knot"));
    const width = track.clientWidth;
    const height = track.offsetHeight;

    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    const origin = track.getBoundingClientRect();
    const points = knots.map(function (knot) {
      const rect = knot.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - origin.left,
        y: rect.top + rect.height / 2 - origin.top,
      };
    });

    if (!points.length) return null;

    const narrow = window.matchMedia("(max-width: 640px)").matches;
    const bulge = narrow ? Math.min(42, width * 0.11) : 28;
    let d = "M " + points[0].x.toFixed(1) + " " + points[0].y.toFixed(1);

    for (let i = 1; i < points.length; i += 1) {
      const previous = points[i - 1];
      const current = points[i];
      const goingRight = current.x >= previous.x;
      const c1x = Math.max(6, Math.min(width - 6, previous.x + (goingRight ? -bulge : bulge)));
      const c2x = Math.max(6, Math.min(width - 6, current.x + (goingRight ? bulge : -bulge)));
      const dy = current.y - previous.y;
      d +=
        " C " +
        c1x.toFixed(1) +
        " " +
        (previous.y + dy * 0.42).toFixed(1) +
        ", " +
        c2x.toFixed(1) +
        " " +
        (previous.y + dy * 0.58).toFixed(1) +
        ", " +
        current.x.toFixed(1) +
        " " +
        current.y.toFixed(1);
    }

    guide.setAttribute("d", d);
    draw.setAttribute("d", d);
    return { draw: draw, length: draw.getTotalLength() };
  }

  function setupJourney() {
    if (!window.gsap) return;

    const line = layoutJourney();
    if (!line) return;

    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    if (lineTween) {
      if (lineTween.scrollTrigger) lineTween.scrollTrigger.kill();
      lineTween.kill();
    }

    if (!window.ScrollTrigger || prefersReducedMotion()) {
      gsap.set(line.draw, { strokeDashoffset: 0 });
      document.querySelectorAll(".knot").forEach(function (knot) {
        knot.classList.add("is-lit");
      });
      return;
    }

    gsap.set(".stop", { autoAlpha: 0 });
    gsap.set(line.draw, { strokeDashoffset: line.length });
    lineTween = gsap.fromTo(
      line.draw,
      { strokeDashoffset: function () { return line.draw.getTotalLength(); } },
      {
        strokeDashoffset: 0,
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          trigger: ".journey-track",
          start: "top 70%",
          end: "bottom 65%",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      }
    );

    ScrollTrigger.batch(".stop", {
      start: "top 82%",
      onEnter: function (batch) {
        gsap.to(batch, {
          autoAlpha: 1,
          stagger: 0.08,
          duration: 0.7,
          ease: "power2.out",
          overwrite: true,
        });
        batch.forEach(function (stop) {
          const knot = stop.querySelector(".knot");
          if (knot) knot.classList.add("is-lit");
        });
      },
      onLeaveBack: function (batch) {
        batch.forEach(function (stop) {
          const knot = stop.querySelector(".knot");
          if (knot) knot.classList.remove("is-lit");
        });
      },
    });

    const track = document.querySelector(".journey-track");
    track.querySelectorAll("img").forEach(function (img) {
      if (img.complete) return;
      img.addEventListener(
        "load",
        function () {
          layoutJourney();
          ScrollTrigger.refresh();
        },
        { once: true }
      );
    });
  }

  function openLetter() {
    if (opened) return;
    opened = true;
    openButton.disabled = true;
    openButton.setAttribute("aria-expanded", "true");
    document.body.classList.add("is-open");

    try {
      playChord();
    } catch (error) {
      // The letter still opens if sound is unavailable.
    }

    if (!window.gsap) {
      finishOpen();
      return;
    }

    if (floatTween) floatTween.kill();
    burst(openButton);

    const reduce = prefersReducedMotion();
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: finishOpen,
    });

    if (reduce) {
      tl.set(".wax", { autoAlpha: 0 })
        .set(".gate", { autoAlpha: 0 })
        .set(".dawn", { autoAlpha: 1 })
        .set(".letter", { autoAlpha: 1 })
        .set(".letter .reveal", { autoAlpha: 1, y: 0 });
      return;
    }

    tl.to(".wax", {
      scale: 0.2,
      autoAlpha: 0,
      rotation: -30,
      duration: 0.4,
      ease: "power2.in",
    })
      .to(
        ".envelope-flap",
        { rotationX: -105, autoAlpha: 0, duration: 0.8, ease: "power2.inOut" },
        "-=0.05"
      )
      .to(".gate", { autoAlpha: 0, y: -28, duration: 0.7, ease: "power2.inOut" }, "-=0.2")
      .to(".dawn", { autoAlpha: 1, duration: 1.2 }, "<")
      .fromTo(
        ".letter",
        { autoAlpha: 0, y: 30, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.9 },
        "-=0.4"
      )
      .from(
        ".letter .reveal",
        { autoAlpha: 0, y: 16, stagger: 0.11, duration: 0.65 },
        "-=0.5"
      );
  }

  function intro() {
    if (!window.gsap || prefersReducedMotion()) {
      showStatically();
      return;
    }

    gsap.set(".intro-item", { autoAlpha: 0, y: 16 });
    const introTl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: function () {
        floatTween = gsap.to(".envelope", {
          y: -8,
          duration: 2.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      },
    });

    introTl.to(".intro-item", {
      autoAlpha: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.14,
    });
  }

  let resizeTimer = 0;
  window.addEventListener("resize", function () {
    if (!journeyReady || !window.ScrollTrigger) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      layoutJourney();
      ScrollTrigger.refresh();
    }, 150);
  });

  openButton.addEventListener("click", openLetter);

  if (document.readyState === "complete") {
    intro();
  } else {
    window.addEventListener("load", intro);
  }

  window.setTimeout(function () {
    if (!window.gsap) showStatically();
  }, 1500);
})();
