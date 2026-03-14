import { useState } from "preact/hooks";

function ExerciseStart({ handleClick, output, children }) {
  return (
    <>
      <h2>Create Your First Serverless Function</h2>
      <p>
        Create a new file at <code>/netlify/functions/hello-world.js</code> and
        put the following inside:
      </p>
      {children}

      <p>
        This function calls the{" "}
        <a href="https://catfact.ninja/">Cat Facts API</a>, a free public API,
        to return a random cat fact. Save the file, then run{" "}
        <code>netlify dev</code> to test locally. Check your work by clicking
        the button below!
      </p>

      {output && (
        <div class="error">
          <p>
            There was a problem checking your function. The error message is:
          </p>
          <pre>{output}</pre>
          <p>
            Please check that the file exists in the right place and that the
            code matches the sample above.
          </p>
        </div>
      )}

      <button onClick={handleClick} class="button">
        Test Your Function
      </button>
    </>
  );
}

function ExerciseFinish({ fact }) {
  return (
    <>
      <h2>You did it!</h2>
      <p>
        You've successfully created your first Netlify Function! It called a
        public API and returned this cat fact:
      </p>
      <blockquote>{fact}</blockquote>
    </>
  );
}

export default function FunctionTester({ children }) {
  const [output, setOutput] = useState();
  const [fact, setFact] = useState();

  function handleClick() {
    fetch("/.netlify/functions/hello-world")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((result) => {
        setFact(result);
        setOutput(null);
      })
      .catch((err) => {
        console.log(err);
        setOutput(
          `Please create your function and
run \`netlify dev\` in your CLI.`
        );
      });
  }

  return fact ? (
    <ExerciseFinish fact={fact} />
  ) : (
    <ExerciseStart handleClick={handleClick} output={output}>
      {children}
    </ExerciseStart>
  );
}
