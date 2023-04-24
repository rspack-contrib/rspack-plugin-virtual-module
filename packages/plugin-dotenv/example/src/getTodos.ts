export async function getTodos() {
  console.log(process.env.API_URL);
  const response = await fetch(process.env.API_URL ?? '');
  const todos = await response.json();
  return todos;
}
