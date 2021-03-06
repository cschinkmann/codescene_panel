import '../../lib/isorender/dom-shims';

import {expect, config} from 'chai';

import {SimpleApp} from '../fixtures/simple-app';
import {NestedApp, NestedChild} from '../fixtures/nested-app';
import {AttrsReflectionApp} from '../fixtures/attrs-reflection-app';
import {BadAttrsSchemaApp} from '../fixtures/bad-attrs-schema-app';
import {
  BadBooleanRequiredAttrsSchemaApp,
  BadDefaultRequiredAttrsSchemaApp,
  RequiredAttrsSchemaApp,
} from '../fixtures/required-attrs-schema-apps';
import {DefaultLightThemedWidget, DarkApp, ThemedWidget} from '../fixtures/context-app';
import {LightTheme} from '../fixtures/simple-contexts';

import nextAnimationFrame from './nextAnimationFrame';
import {compactHtml} from '../utils';
config.truncateThreshold = 0; // nicer deep equal errors
customElements.define(`nested-app`, NestedApp);
customElements.define(`nested-child`, NestedChild);
customElements.define(`simple-app`, SimpleApp);
customElements.define(`attrs-reflection-app`, AttrsReflectionApp);
customElements.define(`required-attrs-schema-app`, RequiredAttrsSchemaApp);
customElements.define(`bad-boolean-required-attrs-schema-app`, BadBooleanRequiredAttrsSchemaApp);
customElements.define(`bad-default-required-attrs-schema-app`, BadDefaultRequiredAttrsSchemaApp);
customElements.define(`default-light-themed-widget`, DefaultLightThemedWidget);
customElements.define(`dark-app`, DarkApp);
customElements.define(`themed-widget`, ThemedWidget);

describe(`Server-side component renderer`, function () {
  beforeEach(function () {
    document.body = document.createElement(`body`);
  });

  it(`can register and create components with document.createElement`, function () {
    const el = document.createElement(`simple-app`);
    expect(el.state).to.eql({foo: `bar`, baz: `qux`});
  });

  it(`supports class instantiation`, function () {
    const el = new SimpleApp();
    expect(el.state).to.eql({foo: `bar`, baz: `qux`});
  });

  it(`renders a simple component`, async function () {
    const el = new SimpleApp();
    el.connectedCallback();

    await nextAnimationFrame();

    const html = el.innerHTML;
    expect(html.toLowerCase()).to.contain(`<div class="foo">`);
    expect(html).to.contain(`Value of foo: bar`);
    expect(html).to.contain(`Foo capitalized: Bar`);
  });

  it(`renders updates`, async function () {
    const el = new SimpleApp();
    el.connectedCallback();

    await nextAnimationFrame();

    expect(el.textContent).to.contain(`Value of foo: bar`);
    expect(el.textContent).to.contain(`Foo capitalized: Bar`);
    el.update({foo: `new value`});

    await nextAnimationFrame();

    expect(el.textContent).to.contain(`Value of foo: new value`);
    expect(el.textContent).to.contain(`Foo capitalized: New value`);
  });

  it(`renders nested components`, async function () {
    const el = new NestedApp();
    document.body.appendChild(el);

    await nextAnimationFrame();

    // check DOM structure
    expect(el.childNodes).to.have.lengthOf(1);
    expect(el.childNodes[0].className).to.equal(`nested-foo`);
    expect(el.childNodes[0].childNodes).to.have.lengthOf(2);

    const nestedChild = el.childNodes[0].childNodes[1];
    expect(nestedChild.childNodes).to.have.lengthOf(1);
    expect(nestedChild.childNodes[0].className).to.equal(`nested-foo-child`);
    expect(nestedChild.childNodes[0].childNodes).to.have.lengthOf(3);

    // check content/HTML output
    const html = el.innerHTML;
    expect(html.toLowerCase()).to.contain(`<div class="nested-foo">`);
    expect(html).to.contain(`Nested app: test`);
    expect(html.toLowerCase()).to.contain(`<div class="nested-foo-child">`);
    expect(html).to.contain(`parent title: test`);
    expect(html).to.contain(`animal: llama`);
    expect(html).to.contain(`child animal: fox`);
  });

  it(`updates nested components`, async function () {
    const el = new NestedApp();
    document.body.appendChild(el);

    await nextAnimationFrame();

    const nestedChild = el.childNodes[0].childNodes[1];
    expect(nestedChild.state.title).to.equal(`test`);
    nestedChild.update({title: `meow`});

    await nextAnimationFrame();

    expect(el.state.title).to.equal(`meow`);
    expect(el.innerHTML).to.contain(`Nested app: meow`);
    expect(nestedChild.innerHTML).to.contain(`parent title: meow`);
    el.update({title: `something else`});

    await nextAnimationFrame();

    expect(nestedChild.innerHTML).to.contain(`parent title: something else`);
  });

  it(`renders attributes`, async function () {
    const el = new AttrsReflectionApp();
    el.connectedCallback();
    await nextAnimationFrame();

    expect(el.innerHTML).to.equal(
      compactHtml(`
      <div class="attrs-reflection-app">
        <p>str-attr: "hello"</p>
        <p>bool-attr: false</p>
        <p>number-attr: 0</p>
        <p>json-attr: null</p>
      </div>
    `),
    );
  });

  it(`reacts to attribute updates`, async function () {
    const el = new AttrsReflectionApp();
    el.connectedCallback();
    await nextAnimationFrame();

    el.setAttribute(`str-attr`, `world`);
    el.setAttribute(`bool-attr`, `false`);
    el.setAttribute(`number-attr`, `500843`);
    el.setAttribute(`json-attr`, `{"foo": "bae"}`);

    expect(el.attr(`str-attr`)).to.equal(`world`);
    expect(el.attr(`bool-attr`)).to.equal(false);
    expect(el.attr(`number-attr`)).to.equal(500843);
    expect(el.attr(`json-attr`)).to.deep.equal({foo: `bae`});

    await nextAnimationFrame();

    expect(el.innerHTML).to.equal(
      compactHtml(`
      <div class="attrs-reflection-app">
        <p>str-attr: "world"</p>
        <p>bool-attr: false</p>
        <p>number-attr: 500843</p>
        <p>json-attr: {"foo":"bae"}</p>
      </div>
    `),
    );
  });

  it(`handles malformed attribute updates`, async function () {
    const el = new AttrsReflectionApp();
    el.setAttribute(`str-attr`, `?????????????????? -> ????????????????????????`);
    el.setAttribute(`bool-attr`, ``);
    el.setAttribute(`number-attr`, `500843 abra cadabra`);
    el.setAttribute(`json-attr`, `{"foo": not %%^ json`);
    el.connectedCallback();

    expect(el.attrs()).to.deep.equal({
      'str-attr': `?????????????????? -> ????????????????????????`,
      'bool-attr': true,
      'number-attr': null,
      'json-attr': null,
    });

    await nextAnimationFrame();

    expect(el.innerHTML).to.equal(
      compactHtml(`
      <div class="attrs-reflection-app">
        <p>str-attr: "?????????????????? -&gt; ????????????????????????"</p>
        <p>bool-attr: true</p>
        <p>number-attr: null</p>
        <p>json-attr: null</p>
      </div>
    `),
    );
  });

  it(`throws error for invalid attr access`, async function () {
    const el = document.createElement(`attrs-reflection-app`);
    el.connectedCallback();

    expect(() => el.attr(`bad-attr`)).to.throw(`${el}: attr 'bad-attr' is not defined in attrsSchema`);
  });

  it(`throws error for invalid value in an enum attr`, function () {
    const el = new AttrsReflectionApp();

    expect(() => el.setAttribute(`str-attr`, `boo!`)).to.throw(
      `Invalid value: 'boo!' for attr: str-attr. Only ('hello' | 'world' | '?????????????????? -> ????????????????????????') is valid.`,
    );
  });

  it(`throws error if there is a malformed attrsSchema type`, function () {
    expect(() => new BadAttrsSchemaApp()).to.throw(
      `Invalid type: bool for attr: bad-attr in attrsSchema. Only ('string' | 'boolean' | 'number' | 'json') is valid.`,
    );
  });

  it(`renders when required attrs are provided`, async function () {
    const el = new RequiredAttrsSchemaApp();
    el.setAttribute(`str-attr`, `a value`);
    el.connectedCallback();
    await nextAnimationFrame();

    expect(el.innerHTML).to.equal(`<div>Shouldn't render with missing attribute!</div>`);
  });

  it(`throws error for missing required attrs`, async function () {
    const el = document.createElement(`required-attrs-schema-app`);

    expect(() => el.connectedCallback()).to.throw(`${el}: is missing required attr 'str-attr'`);
  });

  it(`throws error for invalid default required attrs`, async function () {
    expect(() => {
      document.createElement(`bad-default-required-attrs-schema-app`);
    }).to.throw(/attr 'greeting-attr' cannot have both required and default/);
  });

  it(`throws error for invalid boolean required attrs`, async function () {
    expect(() => {
      document.createElement(`bad-boolean-required-attrs-schema-app`);
    }).to.throw(/boolean attr 'bool-attr' cannot have required or default/);
  });

  // TODO: add more server-side context test cases
  describe(`Component with contexts`, function () {
    context(`getContext()`, function () {
      it(`returns own default context without context ancestor`, async function () {
        const widget = document.createElement(`default-light-themed-widget`);
        document.body.appendChild(widget);
        await nextAnimationFrame();
        expect(widget.getContext(`theme`)).to.be.an.instanceof(LightTheme);
        expect(widget.el.childNodes[0].className).to.equal(`light`);
      });
    });

    context(`lifecycle`, function () {
      it(`fails to connect when a context declared in config does not have a default context by itself or from any context ancestor`, async function () {
        const errors = [];
        const widget = document.createElement(`themed-widget`);

        try {
          document.body.appendChild(widget);
          await nextAnimationFrame();
        } catch (err) {
          errors.push(err.message);
        }

        expect(errors).to.have.lengthOf(1);
        expect(errors[0]).to.contain(`A "theme" context is not available`);
      });
    });
  });
});
