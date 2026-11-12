// Blog de Creanautas: barra de lectura, índice del artículo, aparición suave al bajar
// y botón flotante a la guía. Todo es opcional: sin JavaScript el artículo se lee igual.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var article = document.querySelector('.post article');

  // Índice "En este artículo" a partir de los subtítulos
  var toc = document.querySelector('.toc');
  if (toc && article) {
    var heads = article.querySelectorAll(':scope > h2, .box.app > h2');
    var list = toc.querySelector('ol');
    var n = 0;
    heads.forEach(function (h) {
      if (h.closest('.cta')) return;
      n += 1;
      if (!h.id) h.id = 'parte-' + n;
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      list.appendChild(li);
    });
    if (n >= 2) toc.hidden = false;
  }

  // Barra de progreso de lectura y botón flotante
  var bar = document.querySelector('.progress span');
  var floatCta = document.querySelector('.float-cta');
  var ctas = document.querySelectorAll('.post .cta, .post .cta-mini');
  if (floatCta) floatCta.hidden = false;
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (bar) bar.style.transform = 'scaleX(' + pct + ')';
    if (floatCta) {
      // Se esconde mientras haya una invitación a la guía en pantalla, para no taparla
      var ctaVisible = Array.prototype.some.call(ctas, function (c) {
        var r = c.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0;
      });
      floatCta.classList.toggle('on', pct > 0.18 && !ctaVisible);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Aparición suave de bloques al bajar
  if (reduce || !('IntersectionObserver' in window)) return;
  var targets = document.querySelectorAll('.card, .post article > h2, .post article > p, .post article > ol, .post article > ul, .box, .cta, .cta-mini, .author, .mini, .toc');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add('in');
      io.unobserve(el);
      // Ya visible: quitar las clases para que el hover no herede el retraso escalonado
      setTimeout(function () { el.classList.remove('fx', 'in'); el.style.removeProperty('--d'); }, 1100);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  targets.forEach(function (el, i) {
    var sibs = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
    if (el.classList.contains('card') || el.classList.contains('mini')) el.style.setProperty('--d', Math.min(sibs, 5) * 80 + 'ms');
    el.classList.add('fx');
    io.observe(el);
  });
})();
