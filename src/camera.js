// Swish Street - perspective camera with look-at, projection and near-plane polygon clipping.
(function () {
  'use strict';
  var SS = window.SS;
  function Camera() {
    this.x = 0; this.y = 2.6; this.z = -7;
    this.tx = 0; this.ty = 2.4; this.tz = 0;
    this.F = 600; this.cx = 200; this.cy = 300;
    this.near = 0.15;
    this.update();
  }
  Camera.prototype.update = function () {
    var fx = this.tx - this.x, fy = this.ty - this.y, fz = this.tz - this.z;
    var fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
    fx /= fl; fy /= fl; fz /= fl;
    // right = up x f
    var rx = fz, ry = 0, rz = -fx;
    var rl = Math.sqrt(rx * rx + rz * rz) || 1; rx /= rl; rz /= rl;
    // up = f x right
    var ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
    this.fx = fx; this.fy = fy; this.fz = fz;
    this.rx = rx; this.ry = ry; this.rz = rz;
    this.ux = ux; this.uy = uy; this.uz = uz;
    this.yaw = Math.atan2(fx, fz);
    this.pitch = Math.asin(fy);
  };
  // camera-space coords
  Camera.prototype.toCam = function (x, y, z, out) {
    var dx = x - this.x, dy = y - this.y, dz = z - this.z;
    out.x = dx * this.rx + dy * this.ry + dz * this.rz;
    out.y = dx * this.ux + dy * this.uy + dz * this.uz;
    out.z = dx * this.fx + dy * this.fy + dz * this.fz;
    return out;
  };
  // project world point; returns false if behind camera. out: {x,y,s(scale px per metre),z(depth)}
  var tmp = { x: 0, y: 0, z: 0 };
  Camera.prototype.project = function (x, y, z, out) {
    this.toCam(x, y, z, tmp);
    out.z = tmp.z;
    if (tmp.z < this.near) { out.s = 0; return false; }
    var k = this.F / tmp.z;
    out.x = this.cx + tmp.x * k;
    out.y = this.cy - tmp.y * k;
    out.s = k;
    return true;
  };
  Camera.prototype.depth = function (x, y, z) {
    return (x - this.x) * this.fx + (y - this.y) * this.fy + (z - this.z) * this.fz;
  };
  // Screen y of the horizon (direction with zero height relative to camera).
  Camera.prototype.horizonY = function () {
    // point far ahead at camera height along horizontal forward
    var hl = Math.sqrt(this.fx * this.fx + this.fz * this.fz) || 1;
    var p = {};
    this.project(this.x + this.fx / hl * 1000, this.y, this.z + this.fz / hl * 1000, p);
    return p.y;
  };
  // Trace a world-space polygon (array of [x,y,z]) into ctx path, clipped at near plane.
  var c1 = { x: 0, y: 0, z: 0 };
  Camera.prototype.polyPath = function (ctx, pts) {
    var cam = [], i;
    for (i = 0; i < pts.length; i++) {
      this.toCam(pts[i][0], pts[i][1], pts[i][2], c1);
      cam.push([c1.x, c1.y, c1.z]);
    }
    var n = this.near, out = [];
    for (i = 0; i < cam.length; i++) {
      var A = cam[i], B = cam[(i + 1) % cam.length];
      var ain = A[2] >= n, bin = B[2] >= n;
      if (ain) out.push(A);
      if (ain !== bin) {
        var t = (n - A[2]) / (B[2] - A[2]);
        out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, n]);
      }
    }
    if (out.length < 3) return false;
    ctx.beginPath();
    for (i = 0; i < out.length; i++) {
      var k = this.F / out[i][2];
      var sx = this.cx + out[i][0] * k, sy = this.cy - out[i][1] * k;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    return true;
  };
  // Line segment clipped at near plane
  Camera.prototype.line = function (ctx, x1, y1, z1, x2, y2, z2) {
    var a = {}, b = {};
    this.toCam(x1, y1, z1, a); this.toCam(x2, y2, z2, b);
    var n = this.near;
    if (a.z < n && b.z < n) return;
    if (a.z < n) { var t = (n - a.z) / (b.z - a.z); a.x += (b.x - a.x) * t; a.y += (b.y - a.y) * t; a.z = n; }
    if (b.z < n) { var t2 = (n - b.z) / (a.z - b.z); b.x += (a.x - b.x) * t2; b.y += (a.y - b.y) * t2; b.z = n; }
    ctx.moveTo(this.cx + a.x * this.F / a.z, this.cy - a.y * this.F / a.z);
    ctx.lineTo(this.cx + b.x * this.F / b.z, this.cy - b.y * this.F / b.z);
  };
  SS.Camera = Camera;
})();
