<!-- pages/index.vue -->

<template>
  <div class="landing">
    <div class="row">
      <div class="column">
        <h1>Why did places matter in the Holocaust?</h1>
        <p>The Holocaust was not limited to iconic places like Auschwitz and the Warsaw ghetto. It transformed
        ordinary places – city streets, public squares, farm fields, forests. The Nazi regime and their
        collaborators created thousands of places where civilians were confined, tortured, exploited, and killed.
        The violence inspired their targets to create safe spaces, places to hide and resist. This interactive
        website is the first place-based, text and mapping platform for studying where, and how, the Holocaust
        unfolded, as described in survivor testimonies and perpetrator documents. Explore the geographies of
        the Holocaust from the scale of the continent to one person’s experience.</p>
    </div>
    </div>
    <div class="links row">
      <div class="text-center">
        <NuxtLink to="/map">Mapping Camps and Ghettos</NuxtLink>
        <NuxtLink to="/search">Testimony Search</NuxtLink>
        <NuxtLink to="/transcripts">View All Transcripts</NuxtLink>
        <NuxtLink to="/documentation">Documentation and Data</NuxtLink>
        <NuxtLink to="/about">About the Project</NuxtLink>
      </div>
    </div>
    <div class="logo text-center margin-top-20">
      <img src="/media/UMaine_fullcrest_logo4c_gray.png" alt="UMaine Logo" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
}
</script>

<style scoped>
.home {
  text-align: center;
  margin-top: 50px;
  padding: 0 20px;
}

.landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  flex: 1; /* Allows this container to grow and fill available space */
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr; /* Two columns */
  gap: 20px;
  width: 100%;
  max-width: 1200px;
}

.logo {
  position: absolute; /* Position the logo absolutely within .landing */
  bottom: 20px;
  right: 20px;
}

h1 {
  color: black;
  font-size: 3em;
  margin-bottom: 10px;
}

p {
  font-family: 'usual', sans-serif;
  font-size: 1.2em;
  color: #2c3e50;
  margin-bottom: 30px;
}

.links {
  display: flex;
  flex-direction: column;
  padding-top: 45px;
  gap: 15px;
}

.links a {
  color: gray;
  background-color: lightgray;
  padding: 10px 20px;
  border-radius: 5px;
  text-decoration: none;
  font-weight: 300;
  transition: background-color 0.3s;
}

.links a:hover {
  color: white;
  background-color: gray;
}

.logo img {
  width: 200px;
  height: auto;
}
</style>

