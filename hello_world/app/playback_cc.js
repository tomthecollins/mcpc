define(function (require) {
  // These are some comments I (Tom) left in from the require package.
  // Load any app-specific with a relative require call, like:
  // var messages = require('./messages');
  // Load library/vendor modules using full IDs, like:
  // var print = require('print');
  // print(messages.getHello());

  // This is for the visualisation.
  var pianoCursor = $('#piano_cursor');
	var pianoCursorTop=0;
	var vocalCursor = $('#vocal_cursor');
	var vocalCursorTop=0;

  // Set some playback parameters and console.log the example Composition
  // object.
  var zoom_level = 2;
  var left_most_ontime = 0;
  var samples_idx = "../../samples_idx/20150810/";
  console.log('comp:');
  console.log(comp);

  // Pass the Composition object and parameters to the playback function.
  var c = tonejs_playback(comp, zoom_level, left_most_ontime, samples_idx);
  console.log('advanceOntimes:');
  console.log(c.advanceOntimes);
  console.log('advanceOnsets:');
  console.log(c.advanceOnsets);
  // This is for the visualisation.
  for (j = 0; j < c.advanceOnsets.length; j++){
    Tone.Transport.setTimeout(function(){
      vocalCursorTop +=5;
      vocalCursor.css({top:vocalCursorTop+(vocalCursorTop?'px':'')});
    }, c.advanceOnsets[j]);
  }

  // Loop over the Instruments and define Tone.PolySynths as appropriate.
  var fx_counter = 1; // Counter so that effects are uniquely defined.
  var instr_keys = Object.keys(c.Instruments);
  for (i = 0; i < instr_keys.length; i++){
    if (c.Instruments[instr_keys[i]].samples !== undefined){
      // Samples-based instrument.
      var curr_instr_str = 'var ' + instr_keys[i] + ' = new Tone.PolySynth(c.Instruments.' +
      instr_keys[i] + '.polyphony, Tone.Sampler, ' +
      'c.Instruments.'+ instr_keys[i] + '.samples, ' +
      'c.Instruments.'+ instr_keys[i] + '.volEnvEtc).toMaster();';
      eval(curr_instr_str);
      // Here's an example of checking for, defining, and connecting an effect.
      if (c.Instruments[instr_keys[i]].volEnvEtc !== undefined &&
          c.Instruments[instr_keys[i]].volEnvEtc.distortion !== undefined){
        var fx_str = 'var fx_' + fx_counter + ' = new Tone.Distortion(' +
        c.Instruments[instr_keys[i]].volEnvEtc.distortion + ').toMaster();';
        eval(fx_str);
        // Connect the distortion effect to the instrument.
        eval(instr_keys[i] + '.connect(fx_' + fx_counter + ');');
        fx_counter++;
      }
    }
    else {
      // Synth-based instrument.
      var curr_instr_str = 'var ' + instr_keys[i] + ' = new Tone.PolySynth(c.Instruments.' +
      instr_keys[i] + '.polyphony, Tone.MonoSynth, ' +
      'c.Instruments.'+ instr_keys[i] + '.volEnvEtc).toMaster();';
      eval(curr_instr_str);
    }
    // console.log('curr_instr_str:');
    // console.log(curr_instr_str);
  }
  // This is an example of a non-loop version, where the syntax is a bit
  // easier to read.
  //var piano_1 = new Tone.PolySynth(c.Instruments.piano_1.polyphony, Tone.Sampler,
  //  c.Instruments.piano_1.samples,
  //  c.Instruments.piano_1.volEnvEtc).toMaster();
  //var synth_bass_1 = new Tone.PolySynth(c.Instruments.synth_bass_1.polyphony,
  //  Tone.MonoSynth, c.Instruments.synth_bass_1.volEnvEtc).toMaster();

  // Loop over the Instruments and define the Note.routes.
  for (i = 0; i < instr_keys.length; i++){
    var curr_route_str = 'Tone.Note.route("' + instr_keys[i] + '", ' +
    'function(time, note, duration, velocity){' +
    instr_keys[i] + '.triggerAttackRelease(note, duration, time, ' +
    'velocity);});';
    eval(curr_route_str);
    // console.log('curr_route_str:');
    // console.log(curr_route_str);
  }
  // This is an example of a non-loop version, where the syntax is a bit
  // easier to read.
  //Tone.Note.route("piano_1", function(time, note, duration, velocity){
  //  piano_1.triggerAttackRelease(note, duration, time, velocity);
  //});
  //Tone.Note.route("synth_bass_1", function(time, note, duration, velocity){
  //  synth_bass_1.triggerAttackRelease(note, duration, time, velocity);
  //});

  // Parse the Score.
  Tone.Note.parseScore(c.Score);
  Tone.Transport.bpm.value = 120;
  // Tone.Transport.loop = true;
  // Tone.Transport.setLoopPoints(0, "3m");

  // Time the loading of the audio material into the Tone.Buffer.
  var t0 = Math.round(+new Date()/1000);
  console.log('t0:');
  console.log(t0);
  Tone.Buffer.onload = function(){
    var t1 = Math.round(+new Date()/1000);
    console.log('Time (in sec) elapsed loading buffer:');
    console.log(t1 - t0);
  };
  console.log('Tone.Buffer._queue:');
  console.log(Tone.Buffer._queue);

  var isPlaying=false;
  $(document).click(function(){
    isPlaying?Tone.Transport.stop():Tone.Transport.start();
    isPlaying=isPlaying?false:true;
  });

  function comp2instruments_and_score(
  comp, left_most_onset, samples_idx, samples_lookup){
    // Tom Collins 5/9/2015.
    // This function parses the notes array of a Composition object and
    // determines the timing of notes in seconds as well as the sounds that are
    // required to be loaded by Tone.js.

    // The first argument comp is the Composition object. It is assumed that
    // the irrelevant notes have already been removed (irrelevant because they
    // occur before the currently showing ontime in the composition). The
    // second argument left_most_onset is an onset value to allow playing the
    // Composition object from partway through. It is subtracted from the
    // calculated onsets fairly late on. The third argument samples_idx locates
    // index files for the various instruments. The fourth argument
    // samples_lookup is a reverse index, making it possible for a user to
    // specify an instrument name by string alone (e.g., synth_piano_1), and
    // then the location of the corresponding index file can be sought by
    // querying samples_lookup with that string.

    if (left_most_onset == undefined){
      left_most_onset = 0;
    }
    if (samples_idx == undefined) {
      samples_idx = "../../samples_idx/20150810/";
    }
    //samples_dir = {
    //  keyboards: {
    //    pianos: [
    //        "piano_1",
    //        "piano_2",
    //        "synth_piano_1"
    //      ]
    //  },
    //  plucked_strings: {
    //    bass_guitars: [
    //        "synth_bass_1"
    //      ],
    //    electric_guitars: [
    //        "electric_guitar_1"
    //      ]
    //  },
    //  unpitched_percussion: {
    //    drum_kits: [
    //        "rock_kit_1",
    //        "synth_kit_1"
    //      ]
    //  },
    //
    //};
    if (samples_lookup == undefined) {
      samples_lookup = {
        "piano_1": "keyboards/pianos/piano_1",
        "piano_2": "keyboards/pianos/piano_2",
        "synth_piano_1": "keyboards/pianos/synth_piano_1",
        "synth_bass_1": "plucked_strings/bass_guitars/synth_bass_1",
        "electric_guitar_1": "plucked_strings/electric_guitars/electric_guitar_1",
        "drum_kit_1": "unpitched_percussion/drum_kits/drum_kit_1",
        "synth_kit_1": "unpitched_percussion/drum_kits/synth_kit_1"
      }
    }

    // Some default articulation values.
    var defaultVelocity = .7;
    var defaultPedal = 0;

    // Iterate over staffAndClefNames and get the unique instrument names used in
    // this composition. Also need to take url definitions into consideration.
    var unq_instr_nam = [];
    var unq_url = {};
    var unq_url_idx = 1;
    for (i = 0; i < comp.staffAndClefNames.length; i++){
      if (comp.staffAndClefNames[i].acousticDescriptor !== undefined){
        if (comp.staffAndClefNames[i].acousticDescriptor.url !== undefined){
          var curr_url = comp.staffAndClefNames[i].acousticDescriptor.url;
          if (unq_url[curr_url] == undefined){
            // This url is not yet there.
            unq_url[curr_url] = "URL_" + unq_url_idx;
            unq_url_idx++;
          }
        }
        else {
          if (comp.staffAndClefNames[i].acousticDescriptor.instrument !== undefined){
            var curr_instr_nam = comp.staffAndClefNames[i].acousticDescriptor.instrument;
          }
        }
      }
      else {
        var curr_instr_nam = undefined;
      }

      if (curr_instr_nam !== undefined){
        // This staff number has an instrument associated with it.
        if (unq_instr_nam.indexOf(curr_instr_nam) == -1){
          // This instrument is not yet there.
          unq_instr_nam.push(curr_instr_nam);
        }
      }
      else {
        // This staff number does not have an instrument associated with it.
        // Default to piano_1, and push it to unq_instr_nam if it was not
        // already there.
        if (comp.staffAndClefNames[i].acousticDescriptor == undefined){
          comp.staffAndClefNames[i].acousticDescriptor = {};
        }
        comp.staffAndClefNames[i].acousticDescriptor.instrument = "piano_1";
        var curr_instr_nam =
        comp.staffAndClefNames[i].acousticDescriptor.instrument;
        if (unq_instr_nam.indexOf(curr_instr_nam) == -1){
          // This instrument is not yet there.
          unq_instr_nam.push(curr_instr_nam);
        }
      }
    }
    // Need to look over the notes array as well, as different instruments may be
    // defined here too.
    for (notei = 0; notei < comp.notes.length; notei++){
      if (comp.notes[notei].acousticDescriptor !== undefined){
        if (comp.notes[notei].acousticDescriptor.url !== undefined){
          //
          // Need to think about adding a test here on velocity. It would be dumb
          // to load silent samples.
          var curr_url = comp.notes[notei].acousticDescriptor.url;
          if (unq_url[curr_url] == undefined){
            // This url is not yet there.
            unq_url[curr_url] = "URL_" + unq_url_idx;
            unq_url_idx++;
          }
        }
        else {
          if (comp.notes[notei].acousticDescriptor.instrument !== undefined &&
              unq_instr_nam.indexOf(comp.notes[notei].acousticDescriptor.instrument) == -1){
            // This instrument is not yet there.
            unq_instr_nam.push(comp.notes[notei].acousticDescriptor.instrument);
          }
        }
      }
    }
    // console.log('unq_instr_nam:');
    // console.log(unq_instr_nam);
    // console.log('unq_url:');
    // console.log(unq_url);

    // Get instrument descriptors for each entry in unq_instr_nam. I am storing
    // these in Instruments, so that their sample lists can be
    // reduced/optimised below.
    var Instruments = {};
    for (inam = 0; inam < unq_instr_nam.length; inam++){
      if (samples_lookup[unq_instr_nam[inam]] !== undefined){
        // The instrument name is recognised. Begin by constructing the path to
        // the instrument descriptor file.
        var curr_path = samples_idx + samples_lookup[unq_instr_nam[inam]];
        // var curr_path = './' + unq_instr_nam[inam];
        // console.log('curr_path:');
        // console.log(curr_path);
        // Import the instrument descriptor and assign it to the name used in
        // unq_instr_nam. Ugh, the various attempts at using require
        // programmatically did not work, so I'm bandaiding it with this
        // switch.
        switch (unq_instr_nam[inam]) {
          case 'piano_1':
            var tmp = require('../../samples_idx/20150810/keyboards/pianos/piano_1');
            break;
          case 'piano_2':
            var tmp = require('../../samples_idx/20150810/keyboards/pianos/piano_2');
            break;
          case 'synth_bass_1':
            var tmp = require('../../samples_idx/20150810/plucked_strings/bass_guitars/synth_bass_1');
            break;
          case 'electric_guitar_1':
            var tmp = require('../../samples_idx/20150810/plucked_strings/electric_guitars/electric_guitar_1');
            break;
          case 'drum_kit_1':
            var tmp = require('../../samples_idx/20150810/unpitched_percussion/drum_kits/drum_kit_1');
            break;
          default:
            var tmp = require('../../samples_idx/20150810/keyboards/pianos/synth_piano_1');
            break;
        }
        // var tmp = require(unq_instr_nam[inam]);
        // var tmp = requirejs([curr_path], function(piano_1){});
        // var tmp = requirejs([curr_path]);
        // var tmp = requirejs([curr_path], function(instrumentDescriptor){});
        // console.log('tmp.instrumentDescriptor():');
        // console.log(tmp.instrumentDescriptor());
        // This line works within nodejs.
        // var tmp = require(curr_path).instrumentDescriptor();
        // This line works within a client-side browser.
        eval(unq_instr_nam[inam] + " = tmp.instrumentDescriptor();");
      }
      Instruments[unq_instr_nam[inam]] = tmp.instrumentDescriptor();
    }
    // Append any URLs that are required.
    var unq_url_keys = Object.keys(unq_url);
    for (i = 0; i < unq_url_keys.length; i++){
      var curr_instr = {};
      curr_instr.samples = {
        "sampleURL": unq_url_keys[i]
      }
      curr_instr.volEnvEtc = { "volume": -10 };
      Instruments[unq_url[unq_url_keys[i]]] = curr_instr;
    }
    console.log('Instruments:');
    console.log(Instruments);

    // Use the tempi array to get the times at which each note will be
    // articulated and unarticulated.
    // This line commented out because already calculated if this function is
    // called from tonejs_playback.
    // comp.tempi = append_times_to_tempi(comp.tempi, comp.timeSignatures);
    comp.notes = append_times_to_notes(comp.notes, comp.tempi);
    // NB, following the application of this function, the acousticDescriptor
    // property will always be defined for each note.

    // Iterate over the notes variable of the Composition object and determine
    // which samples are required.
    var samples_req = {};
    for (inote = 0; inote < comp.notes.length; inote++){
      // Logical tracking whether we're dealing with a note for an unpitched
      // percussion instrument.
      var unpitchedPercp = false;
      // console.log('comp.notes[inote]:');
      // console.log(comp.notes[inote]);
      // Get the instrument name string with which this note is associated,
      // either individually or via staffAndClefNames.
      if (comp.notes[inote].acousticDescriptor.instrument !== undefined ||
          comp.notes[inote].acousticDescriptor.url !== undefined){
        // Instrument defined individually.
        if (comp.notes[inote].acousticDescriptor.instrument !== undefined){
          curr_instr_nam = comp.notes[inote].acousticDescriptor.instrument;
        }
        else {
          curr_instr_nam = comp.notes[inote].acousticDescriptor.url;
        }
      }
      else {
        // Instrument defined via staffAndClefNames.
        curr_instr_nam =
        comp.staffAndClefNames[comp.notes[inote].staffNo].acousticDescriptor.instrument;
      }
      // console.log('curr_instr_nam:');
      // console.log(curr_instr_nam);

      if (Instruments[curr_instr_nam] !== undefined &&
          Instruments[curr_instr_nam].samples !== undefined){
        // This is an instrument defined in terms of samples.
        if (comp.notes[inote].acousticDescriptor.url == undefined &&
            comp.staffAndClefNames[comp.notes[inote].staffNo].acousticDescriptor !== undefined &&
            comp.staffAndClefNames[comp.notes[inote].staffNo].acousticDescriptor.percussionMap !== undefined){
          // This is an unpitched percussion instrument.
          unpitchedPercp = true;
          var percMap = comp.staffAndClefNames[comp.notes[inote].staffNo].acousticDescriptor.percussionMap;
          // console.log('percMap:');
          // console.log(percMap);
          var percAvl = Instruments[curr_instr_nam].availablePercussion;
          // console.log('percAvl:');
          // console.log(percAvl);
          // Find the percussion name associated with this note.
          var percMapIdx = arrayObjectIndexOf(percMap, comp.notes[inote].pitch, "pitch");
          var percussionName = undefined;
          if (percMapIdx > -1){
            percussionName = percMap[percMapIdx].percussionName;
          }
          // console.log('percussionName:');
          // console.log(percussionName);
          // console.log('percAvl[percussionName]:');
          // console.log(percAvl[percussionName]);
          var sampleNameShort = undefined;
          if (percussionName !== undefined){
            comp.notes[inote].acousticDescriptor.sampleNameShort = percAvl[percussionName];
          }

        }

        var relMap = Instruments[curr_instr_nam].articDynamMap;
        // eval("relMap = " + curr_instr_nam + ".articDynamMap");
        // console.log('relMap:');
        // console.log(relMap);
        // Get the properties of the relMap variable.
        var relMapKeys = Object.keys(relMap[0]);
        // We do not need 'articDynamStr' in this array, so remove it.
        var articDynamStrIdx = relMapKeys.indexOf('articDynamStr');
        if (articDynamStrIdx > -1){
          relMapKeys.splice(articDynamStrIdx, 1);
        }
        // console.log('relMapKeys:');
        // console.log(relMapKeys);

        // For each articulation-dynamic property, search for its definition in the
        // individual note or, failing that, in the staffAndClefNames, and use
        // these definitions to create a lookup into relMap. If definitions are
        // missing, set them to defaults.
        var mapLookup = {};
        for (i = 0; i < relMapKeys.length; i++){
          var prop_str = relMapKeys[i];
          // console.log('prop_str:');
          // console.log(prop_str);
          if (comp.notes[inote].acousticDescriptor !== undefined &&
            comp.notes[inote].acousticDescriptor[prop_str] !== undefined){
              // Property defined individually.
              mapLookup[prop_str] = comp.notes[inote].acousticDescriptor[prop_str];
          }
          else {
            // Property defined via staffAndClefNames.
            mapLookup[prop_str] =
            comp.staffAndClefNames[comp.notes[inote].staffNo].acousticDescriptor[prop_str];
          }
          // If the property is still undefined, switch over known properties to
          // define a default value.
          if (mapLookup[prop_str] == undefined){
            switch (prop_str){
              case 'velocity':
                mapLookup[prop_str] = defaultVelocity;
                break;
              case 'pedal':
                mapLookup[prop_str] = defaultPedal;
                break;
            }
          }
        }
        // console.log('mapLookup:');
        // console.log(mapLookup);
        // Perform the lookup.
        var relIdx = -1;
        var j = 0;
        while (j < relMap.length && relIdx < 0){
          // Record the test outcomes as zeros or ones.
          var test_outcomes = [];
          for (i = 0; i < relMapKeys.length; i++){
            test_outcomes[i] = 0;
          }
          for (i = 0; i < relMapKeys.length; i++){
            var prop_str = relMapKeys[i];
            // If relMap[j][prop_str] is a two-element numeric array, then check
            // whether mapLookup[prop_str] belongs to this interval:
            // a <= mapLookup[prop_str] < b.
            if (typeof relMap[j][prop_str] == "object" &&
                typeof relMap[j][prop_str][0] == "number" &&
                typeof relMap[j][prop_str][1] == "number"){
              if (mapLookup[prop_str] >= relMap[j][prop_str][0] &&
                  mapLookup[prop_str] < relMap[j][prop_str][1]) {
                test_outcomes[i] = 1;
              }

            }
            else {
              // We can assume relMap[j][prop_str] is an entity to which == can be
              // applied.
              if (mapLookup[prop_str] == relMap[j][prop_str]){
                test_outcomes[i] = 1;
              }
            }
          }
          // console.log('test_outcomes:');
          // console.log(test_outcomes);
          // Sum the test outcomes.
          var checksum = test_outcomes.reduce(function(a, b) {
            return a + b;
          });
          if (checksum == relMapKeys.length){
            // We found the index!
            relIdx = j;
            j = relMap.length - 1;
          }
          j++;
        }
        // console.log('relIdx:');
        // console.log(relIdx);
        // console.log('relevant articDynamMap entry:');
        // console.log(relMap[relIdx]);

        // Add the properties of mapLookup to acousticDescriptor, overwriting any
        // extant values.
        var mapLookupKeys = Object.keys(mapLookup);
        for (k = 0; k < mapLookupKeys.length; k++){
          comp.notes[inote].acousticDescriptor[mapLookupKeys[k]] =
          mapLookup[mapLookupKeys[k]];
        }
        // Include instrument and articDynamStr values.
        comp.notes[inote].acousticDescriptor.instrument = curr_instr_nam;
        // console.log('comp.notes[inote]:');
        // console.log(comp.notes[inote]);
        comp.notes[inote].acousticDescriptor.articDynamStr = relMap[relIdx].articDynamStr;

        // Generate the short sample name.
        if (comp.notes[inote].acousticDescriptor.sampleNameShort == undefined){
          // If a note belongs to an unpitched percussion instrument then this
          // property should already be defined. In the general case where we
          // are not dealing with an unpitched percussion instrument, it gets
          // defined here.
          var MNN = comp.notes[inote].MNN;
          if (MNN < 100){
            MNN = '0' + MNN.toString();
          }
          else{
            MNN = MNN.toString();
          }
          comp.notes[inote].acousticDescriptor.sampleNameShort =
          MNN + '_' + comp.notes[inote].acousticDescriptor.articDynamStr;
        }

        if (comp.notes[inote].acousticDescriptor.velocity > 0){
          // If the note makes a noise, add the sampleNameShort to samples_req.
          if (samples_req[curr_instr_nam] == undefined){
            // This curr_instr_nam has not been populated before.
            if (unpitchedPercp){
              samples_req[curr_instr_nam] = [comp.notes[inote].acousticDescriptor.articDynamStr];
            }
            else {
              samples_req[curr_instr_nam] = [comp.notes[inote].acousticDescriptor.sampleNameShort];
            }
          }
          else {
            if (samples_req[curr_instr_nam].indexOf(
                  comp.notes[inote].acousticDescriptor.sampleNameShort) == -1){
              // This sampleNameShort has not been used before.
              if (unpitchedPercp){
                samples_req[curr_instr_nam].push(
                  comp.notes[inote].acousticDescriptor.articDynamStr);
              }
              else{
                samples_req[curr_instr_nam].push(
                  comp.notes[inote].acousticDescriptor.sampleNameShort);
              }
            }
            // Else it's been used before. Don't add it again.
          }
        }
      }
      else {
        // This note is articulated using an instrument not defined in terms of
        // samples. Still, we need to ensure its acousticDescriptor inherits any
        // property values stored in staffAndClefNames, and where missing, these
        // are populated with appropriate definitions of instrument, velocity,
        // and sampleNameShort.

        // var relMap = undefined;
        var staff_acou =
        comp.staffAndClefNames[comp.notes[inote].staffNo].acousticDescriptor;
        var staff_acou_keys = Object.keys(staff_acou);
        var note_acou = comp.notes[inote].acousticDescriptor;
        if (note_acou == undefined){
          note_acou = {};
        }
        note_acou.instrument = curr_instr_nam;
        // var note_acou_keys = Object.keys(note_acou);
        // The instrument property was already taken care of by an earlier loop,
        // and stored in curr_instr_nam,
        // so remove this from staff_acou_keys and note_acou_keys.
        var instrIdx = staff_acou_keys.indexOf('instrument');
        if (instrIdx > -1){
          staff_acou_keys.splice(instrIdx, 1);
        }
        //if (inote == 0){
        //  console.log('staff_acou:');
        //  console.log(staff_acou);
        //}
        for (i = 0; i < staff_acou_keys.length; i++){
          if (note_acou[staff_acou_keys[i]] == undefined){
            note_acou[staff_acou_keys[i]] = staff_acou[staff_acou_keys[i]];
          }
        }
        //if (inote == 0){
        //  console.log('note_acou:');
        //  console.log(note_acou);
        //}
        if (note_acou.velocity == undefined){
          note_acou.velocity = defaultVelocity;
        }
        note_acou.sampleNameShort = comp.notes[inote].pitch;
        comp.notes[inote].acousticDescriptor = note_acou;
      }


    }
    // console.log('samples_req:');
    // console.log(samples_req);

    // Use samples_req to redefine the samples that are required.
    var samples_req_keys = Object.keys(samples_req);
    for (i = 0; i < samples_req_keys.length; i++){
      var curr_instr = samples_req_keys[i];
      var curr_samp = samples_req[curr_instr];
      var new_samp = {};
      for (j = 0; j < curr_samp.length; j++){
        new_samp[curr_samp[j]] = Instruments[curr_instr].samples[curr_samp[j]];
      }
      Instruments[curr_instr].samples = new_samp;
    }

    // Form the Score variable.
    var Score = {};
    for (i = 0; i < unq_instr_nam.length; i++){
      Score[unq_instr_nam[i]] = [];
    }
    for (i = 1; i <= unq_url_keys.length; i++){
      var curr_prop = "URL_" + i.toString();
      // console.log('curr_prop:');
      // console.log(curr_prop);
      Score[curr_prop] = [];
    }
    for (notei = 0; notei < comp.notes.length; notei++){
      var curr_acou = comp.notes[notei].acousticDescriptor;
      if (curr_acou.url !== undefined){
        Score[unq_url[curr_acou.url]].push(
          [
            curr_acou.onset - left_most_onset,
            "sampleURL",
            // curr_acou.url,
            curr_acou.durSec,
            curr_acou.velocity
          ]
        );
      }
      else {
        if (curr_acou.velocity > 0){
          if (Instruments[curr_acou.instrument].availablePercussion !== undefined){
            Score[curr_acou.instrument].push(
              [
                curr_acou.onset - left_most_onset,
                curr_acou.articDynamStr,
                curr_acou.durSec,
                curr_acou.velocity
              ]
            );
          }
          else {
            Score[curr_acou.instrument].push(
              [
                curr_acou.onset - left_most_onset,
                curr_acou.sampleNameShort,
                curr_acou.durSec,
                curr_acou.velocity
              ]
            );
          }
        }
      }
    }
    console.log('Score:');
    console.log(Score);

    return { "Instruments": Instruments, "Score": Score };
  }


  function append_times_to_tempi(tempi, time_sigs_array){
    // Tom Collins 31/7/2015.
    // This function appends times (in seconds) to rows of the tempi table.
    // It is assumed that both arguments already have ontimes appended to them.
    // If they have come from an XML-imported Composition object, they will
    // have. If using the function append_ontimes_to_time_signatures to achieve
    // this, remember to pass crotchets_per_bar to handle an anacrusis.

    tempi[0].time = 60/tempi[0].bpm*time_sigs_array[0].ontime;
    var n = tempi.length;
    var i = 1;
    while (i < n){
      var c = 60/tempi[i - 1].bpm*(tempi[i].ontime - tempi[i - 1].ontime);
      tempi[i].time = tempi[i - 1].time + c;
      i++;
    }
    return tempi;
  };
  // exports.append_times_to_tempi = append_times_to_tempi;

  // Example:
  //var tempi = [
  //  {"barOn": 1, "beatOn": 1, "ontime": 0, "bpm": 121},
  //  {"barOn": 3, "beatOn": 2, "ontime": 9, "bpm": 80},
  //  {"barOn": 3, "beatOn": 2.5, "ontime": 9.5, "bpm": 55},
  //  {"barOn": 3, "beatOn": 3, "ontime": 10, "bpm": 90}
  //];
  //var time_sigs_array = [{"barNo": 1, "topNo": 4, "bottomNo": 4, "ontime": 0}];
  //var ans = append_times_to_tempi(tempi, time_sigs_array);
  //console.log(ans); // Answer should be:
  //[
  //  {"barOn": 1, "beatOn": 1, "ontime": 0, "bpm": 121, "time": 0},
  //  {"barOn": 3, "beatOn": 2, "ontime": 9, "bpm": 80, "time": 4.46281},
  //  {"barOn": 3, "beatOn": 2.5, "ontime": 9.5, "bpm": 55, "time": 4.83781},
  //  {"barOn": 3, "beatOn": 3, "ontime": 10, "bpm": 90, "time": 5.38326}
  //]


  function append_times_to_notes(notes, tempi){
    // Tom Collins 1/8/2015.
    // This function appends times (in seconds) to each note object in the notes
    // array, assuming that ontimes and times have already been appended to tempo
    // objects in the  tempi array. It does so by creating propeprty/value pairs
    // for onset, offset, and durSec in the acousticDescriptor property of each
    // note.

    // Old version - deprecated 11/9/2015.
    // This function appends times (in seconds) to each note object in the notes
    // array, assuming that ontimes and times have already been appended to tempo
    // objects in the  tempi array.

    var n = notes.length;
    for (i = 0; i < n; i++){
      // See if acousticDescriptor.onAdj or .offAdj are defined for this note,
      // otherwise leave them as default zero values.
      var onAdj = 0;
      var offAdj = 0;
      if (notes[i].acousticDescriptor !== undefined){
        if (notes[i].acousticDescriptor.onAdj !== undefined){
          onAdj = notes[i].acousticDescriptor.onAdj;
        }
        if (notes[i].acousticDescriptor.offAdj !== undefined){
          offAdj = notes[i].acousticDescriptor.offAdj;
        }
      }

      var row_on =
      row_of_max_ontime_leq_ontime_arg(notes[i].ontime + onAdj, tempi);
      var row_off =
      row_of_max_ontime_leq_ontime_arg(notes[i].offtime + offAdj, tempi);
      if (notes[i].acousticDescriptor !== undefined){
        var acousticDescriptor = notes[i].acousticDescriptor;
      }
      else {
        var acousticDescriptor = {};
      }
      acousticDescriptor.onset =
      row_on.time
      + 60/row_on.bpm*(notes[i].ontime + onAdj - row_on.ontime);
      acousticDescriptor.offset = row_off.time
      + 60/row_off.bpm*(notes[i].offtime + offAdj - row_off.ontime);
      acousticDescriptor.durSec = acousticDescriptor.offset - acousticDescriptor.onset;
      // notes[i].onset = onset;
      // notes[i].offset = offset;
      notes[i].acousticDescriptor = acousticDescriptor;
    }

    return notes;
  }
  // exports.append_times_to_notes = append_times_to_notes;

  // Example:
  //var notes = [
  //  { "ontime": 0, "MNN": 72, "offtime": 0.5 },
  //  { "ontime": 0.5, "MNN": 71, "offtime": 1 },
  //  { "ontime": 1, "MNN": 69, "offtime": 1.5 },
  //  { "ontime": 1.5, "MNN": 67, "offtime": 2 },
  //  { "ontime": 2, "MNN": 65, "offtime": 2.5 },
  //  { "ontime": 2.5, "MNN": 64, "offtime": 3 },
  //  { "ontime": 3, "MNN": 62, "offtime": 3.5 },
  //  { "ontime": 3.5, "MNN": 60, "offtime": 4 },
  //  { "ontime": 4, "MNN": 72, "offtime": 4.5 },
  //  { "ontime": 4.5, "MNN": 71, "offtime": 5 },
  //  { "ontime": 5, "MNN": 69, "offtime": 5.5 },
  //  { "ontime": 5.5, "MNN": 67, "offtime": 6 },
  //  { "ontime": 6, "MNN": 65, "offtime": 6.5 },
  //  { "ontime": 6.5, "MNN": 64, "offtime": 7 },
  //  { "ontime": 7, "MNN": 62, "offtime": 7.5 },
  //  { "ontime": 7.5, "MNN": 60, "offtime": 8 },
  //  { "ontime": 8, "MNN": 72, "offtime": 8.5 },
  //  { "ontime": 8.5, "MNN": 71, "offtime": 9 },
  //  { "ontime": 9, "MNN": 69, "offtime": 9.5 },
  //  { "ontime": 9.5, "MNN": 67, "offtime": 10 },
  //  { "ontime": 10, "MNN": 65, "offtime": 10.5 },
  //  { "ontime": 10.5, "MNN": 64, "offtime": 11 },
  //  { "ontime": 11, "MNN": 62, "offtime": 11.5 },
  //  { "ontime": 11.5, "MNN": 60, "offtime": 12 },
  //  { "ontime": 12, "MNN": 72, "offtime": 12.5 },
  //  { "ontime": 12.5, "MNN": 71, "offtime": 13 },
  //  { "ontime": 13, "MNN": 69, "offtime": 13.5 },
  //  { "ontime": 13.5, "MNN": 67, "offtime": 14 },
  //  { "ontime": 14, "MNN": 65, "offtime": 14.5 },
  //  { "ontime": 14.5, "MNN": 64, "offtime": 15 },
  //  { "ontime": 15, "MNN": 62, "offtime": 15.5 },
  //  { "ontime": 15.5, "MNN": 60, "offtime": 16 },
  //]
  //var tempi = [
  //  {"barOn": 1, "beatOn": 1, "ontime": 0, "bpm": 121, "time": 0},
  //  {"barOn": 3, "beatOn": 2, "ontime": 9, "bpm": 80, "time": 4.46281},
  //  {"barOn": 3, "beatOn": 2.5, "ontime": 9.5, "bpm": 55, "time": 4.83781},
  //  {"barOn": 3, "beatOn": 3, "ontime": 10, "bpm": 90, "time": 5.38326}
  //]
  //notes = append_times_to_notes(notes, tempi);
  //console.log(notes); // Answer should be:
  //[
  //  { "ontime": 0, "MNN": 72, "offtime": 0.5, "onset": 0, "offset": 0.24793 },
  //  { "ontime": 0.5, "MNN": 71, "offtime": 1, "onset": 0.24793, "offset": 0.49587 },
  //  { "ontime": 1, "MNN": 69, "offtime": 1.5, "onset": 0.49587, "offset": 0.74380 },
  //  { "ontime": 1.5, "MNN": 67, "offtime": 2, "onset": 0.74380, "offset": 0.99173 },
  //  { "ontime": 2, "MNN": 65, "offtime": 2.5, "onset": 0.99173, "offset": 1.23967 },
  //  { "ontime": 2.5, "MNN": 64, "offtime": 3, "onset": 1.23967, "offset": 1.48760 },
  //  { "ontime": 3, "MNN": 62, "offtime": 3.5, "onset": 1.48760, "offset": 1.73554 },
  //  { "ontime": 3.5, "MNN": 60, "offtime": 4, "onset": 1.73554, "offset": 1.98347 },
  //  { "ontime": 4, "MNN": 72, "offtime": 4.5, "onset": 1.98347, "offset": 2.23140 },
  //  { "ontime": 4.5, "MNN": 71, "offtime": 5, "onset": 2.23140, "offset": 2.47934 },
  //  { "ontime": 5, "MNN": 69, "offtime": 5.5, "onset": 2.47934, "offset": 2.72727 },
  //  { "ontime": 5.5, "MNN": 67, "offtime": 6, "onset": 2.72727, "offset": 2.97521 },
  //  { "ontime": 6, "MNN": 65, "offtime": 6.5, "onset": 2.97521, "offset": 3.22314 },
  //  { "ontime": 6.5, "MNN": 64, "offtime": 7, "onset": 3.22314, "offset": 3.47107 },
  //  { "ontime": 7, "MNN": 62, "offtime": 7.5, "onset": 3.47107, "offset": 3.71901 },
  //  { "ontime": 7.5, "MNN": 60, "offtime": 8, "onset": 3.71901, "offset": 3.96694 },
  //  { "ontime": 8, "MNN": 72, "offtime": 8.5, "onset": 3.96694, "offset": 4.21488 },
  //  { "ontime": 8.5, "MNN": 71, "offtime": 9, "onset": 4.21488, "offset": 4.46281 },
  //  { "ontime": 9, "MNN": 69, "offtime": 9.5, "onset": 4.46281, "offset": 4.83781 },
  //  { "ontime": 9.5, "MNN": 67, "offtime": 10, "onset": 4.83781, "offset": 5.38326 },
  //  { "ontime": 10, "MNN": 65, "offtime": 10.5, "onset": 5.38326, "offset": 5.71660 },
  //  { "ontime": 10.5, "MNN": 64, "offtime": 11, "onset": 5.71660, "offset": 6.04993 },
  //  { "ontime": 11, "MNN": 62, "offtime": 11.5, "onset": 6.04993, "offset": 6.38326 },
  //  { "ontime": 11.5, "MNN": 60, "offtime": 12, "onset": 6.38326, "offset": 6.71660 },
  //  { "ontime": 12, "MNN": 72, "offtime": 12.5, "onset": 6.71660, "offset": 7.04993 },
  //  { "ontime": 12.5, "MNN": 71, "offtime": 13, "onset": 7.04993, "offset": 7.38326 },
  //  { "ontime": 13, "MNN": 69, "offtime": 13.5, "onset": 7.38326, "offset": 7.71660 },
  //  { "ontime": 13.5, "MNN": 67, "offtime": 14, "onset": 7.71660, "offset": 8.04993 },
  //  { "ontime": 14, "MNN": 65, "offtime": 14.5, "onset": 8.04993, "offset": 8.38326 },
  //  { "ontime": 14.5, "MNN": 64, "offtime": 15, "onset": 8.38326, "offset": 8.71660 },
  //  { "ontime": 15, "MNN": 62, "offtime": 15.5, "onset": 8.71660, "offset": 9.04993 },
  //  { "ontime": 15.5, "MNN": 60, "offtime": 16, "onset": 9.04993, "offset": 9.38326 },
  //]


  function row_of_max_ontime_leq_ontime_arg(ontime, tempi){
    // Tom Collins 1/8/2015.
    // This function is very similar to the function row_of_max_bar_leq_bar_arg.
    // It returns the tempo object from the tempi array with maximal ontime less
    // than or equal to the ontime argument.

    var tempo_out = tempi[0]; // Seems unnecessary, as always overwritten.
    var i = 0;
    var n = tempi.length;
    while (i < n) {
      if (ontime < tempi[i]["ontime"]){
        tempo_out = tempi[i - 1];
        i = n - 1;
      }
      else if (ontime == tempi[0]["ontime"]){
        tempo_out = tempi[i];
        i = n - 1;
      }
      else if (i == n - 1){
        tempo_out = tempi[i];
      }
      i=i+1;
    }

    return tempo_out;
  };
  // exports.row_of_max_ontime_leq_ontime_arg = row_of_max_ontime_leq_ontime_arg;

  // Example:
  //var tempi = [
  //  {"barOn": 1, "beatOn": 1, "ontime": 0, "bpm": 121, "time": 0},
  //  {"barOn": 3, "beatOn": 2, "ontime": 9, "bpm": 80, "time": 4.46281},
  //  {"barOn": 3, "beatOn": 2.5, "ontime": 9.5, "bpm": 55, "time": 4.83781},
  //  {"barOn": 3, "beatOn": 3, "ontime": 10, "bpm": 90, "time": 5.38326}
  //]
  //var row = row_of_max_ontime_leq_ontime_arg(9.75, tempi);
  //console.log(row); // Answer should be:
  // {"barOn": 3, "beatOn": 2.5, "ontime": 9.5, "bpm": 55, "time": 4.83781}


  function tonejs_playback(
    comp, zoom_level, left_most_ontime, samples_idx, samples_lookup){
    // Tom Collins 2/8/2015.
    // This function takes a Composition object as its first argument, returning:
    // (1) a Score variable that can be passed to Tone.Note.parseScore(Score);
    // (2) an advance_onsets variable -- an array of onsets at which the piano
    // roll should advance by one zoom-size amount. (It uses the zoom_level and
    // left_most_ontime arguments to achieve this, if provided.);
    // (3) Eventually this function will also return a variable called players,
    // consisting of the information necessary to trigger any specified audio
    // samples during playback.

    // Set any default values not provided.
    if (!zoom_level){
      zoom_level = 1;
    }
    if (!left_most_ontime){
      left_most_ontime = 0;
    }
    if (!samples_idx) {
      samples_idx = "../../samples_idx/20150810/";
    }
    if (!samples_lookup) {
      samples_lookup = {
        "piano_1": "keyboards/pianos/piano_1",
        "piano_2": "keyboards/pianos/piano_2",
        "synth_piano_1": "keyboards/pianos/synth_piano_1",
        "synth_bass_1": "plucked_strings/bass_guitars/synth_bass_1",
        "electric_guitar_1": "plucked_strings/electric_guitars/electric_guitar_1",
        "drum_kit_1": "unpitched_percussion/drum_kits/drum_kit_1",
        "synth_kit_1": "unpitched_percussion/drum_kits/synth_kit_1"
      }
    }

    // Loop over notes, and only include a note if its ontime is greater than or
    // equal to left_most_ontime. (NB. including the role of onAdj.)

    // array has a filter function by default, which calls a functino on each element.
    // if you return true, that element is added to the array that is returned, if not, it is not.
    var rel_notes = comp.notes.filter(function(c){
      // return true if ontime is greater than start of playback
      // OR if ontime is less, and ontime+duration is greater
      return c.ontime >= left_most_ontime || (c.ontime <= left_most_ontime && c.ontime+c.duration > left_most_ontime);
    })

    // Tom, assuming comp.notes is our composition object, we probably want to leave it alone and
    // use the new array rel_notes for playback
    //comp.notes = rel_notes;
    // i did not replace all comp.notes reference with rel_notes, but that's because i didn't have time!

    // Determine the maximum offtime. Need to incorporate recongition of adjOff
    // here.
    var offtimes = [];
    for (i = 0; i < rel_notes.length; i++){
      offtimes.push(rel_notes[i].offtime);
    }
    var max_off = max_argmax(offtimes);
    // console.log('max_off:');
    // console.log(max_off);
    // Calculate the advance_ontimes.
    var advance_ontimes = [left_most_ontime];
    var i = 0;
    while (advance_ontimes[i] < max_off[0] + 4/zoom_level){
      advance_ontimes.push(left_most_ontime + (i + 1)/zoom_level);
      i++;
    }
    // Convert them to advance_onsets.
    comp.tempi = append_times_to_tempi(comp.tempi, comp.timeSignatures);
    advance_onsets = [];
    for (i = 0; i < advance_ontimes.length; i++){
      var row_on =
        row_of_max_ontime_leq_ontime_arg(advance_ontimes[i], comp.tempi);
      advance_onsets[i] =
        row_on.time + 60/row_on.bpm*(advance_ontimes[i] - row_on.ontime);
    }
    // Adjust all advance onsets by a fixed amount such that the first is zero.
    for (i = 0; i < advance_onsets.length; i++){
     advance_onsets[i] = advance_onsets[i] - advance_onsets[0];
    }

    // Use the Composition object's relevant notes to determine which instruments
    // (including samples) need to be loaded, and to define a tonejs Score.
    var instr_score = comp2instruments_and_score(
      comp, advance_onsets[0], samples_idx, samples_lookup);
    // var Score = comp2tonejs_score(comp);

    return { "Instruments": instr_score.Instruments, "Score": instr_score.Score,
             "advanceOntimes": advance_ontimes, "advanceOnsets": advance_onsets };
  }
  // exports.tonejs_playback = tonejs_playback;


  function arrayObjectIndexOf(myArray, searchTerm, property){
    // Joe on Stack Overflow 27/12/2014.
    // In an array of objects that all have the same properties, this function
    // locates the index of the object whose specifiable property is set to a
    // specifiable value.
    // http://stackoverflow.com/questions/8668174/indexof-method-in-an-object-array

    for(var i = 0, len = myArray.length; i < len; i++){
      if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
  }

  //// Example:
  //var q1z = {
  //    hello: 'world',
  //    foo: 'bar'
  //};
  //var qaz = {
  //    hello: 'stevie',
  //    foo: 'baz'
  //}
  //var myArray = [];
  //myArray.push(q1z, qaz);
  //var ans = arrayObjectIndexOf(myArray, "stevie", "hello");
  //console.log(ans);  // Should give 1.


  // This is a direct copy from commandments/array_operations.js.
  function max_argmax(arr){
    // Tom Collins 21/10/2014.
    // Returns the maximum element in an array and its index (argument).

    var max = arr[0];
    var maxIndex = 0;
    for (var i = 1; i < arr.length; i++) {
      if (arr[i] > max) {
        maxIndex = i;
        max = arr[i];
      }
    }
    return [max, maxIndex];
  }

  // Example:
  // var ans = max_argmax([9, -2, 4, 11, -5]);
  // console.log(ans); // Should give [11, 3].

});
