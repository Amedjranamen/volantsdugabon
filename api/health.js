module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).send(JSON.stringify({ ok: true }));
};
