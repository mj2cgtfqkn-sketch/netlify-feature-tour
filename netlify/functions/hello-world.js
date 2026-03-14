exports.handler = async () => {
  const response = await fetch("https://catfact.ninja/fact");
  const { fact } = await response.json();

  return {
    statusCode: 200,
    body: fact,
  };
};
